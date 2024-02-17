import Chat from '../schema/Chat.js';
import Contact from '../schema/Contact.js';
import { sendFacebookMessage } from './faceBookMessage/sendMessage.js';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});
let recipientNumber = "";

const handleSendMessage = (
  email,
  message,
  recipientNumber,
  createdAt,
  requestBody,
  res
) => {
  sendFacebookMessage(requestBody, email)
    .then((response) => {
      console.log('Allowed Response:', response.data);
      const chat = new Chat({
        email,
        message,
        phoneNumber: recipientNumber,
        isComing: false,
        message_id: response.data.messages[0].id,
        createdAt,
      });
      chat
        .save()
        .then(() => {
          console.log('Message saved to MongoDB');
          Chat.find({ email, phoneNumber: recipientNumber })
            .sort({
              createdAt: -1,
            })
            .limit(1)
            .then((message) => {
              return res.status(200).json({ error: false, _id: message[0]._id, message: message[0].message, createdAt: message[0].createdAt });
            });
        })
        .catch((err) => {
          console.error(err.data);
          return res.status(400).json({ error: true });
        });
    })
    .catch((error) => {
      console.log('Allowed Error:', error.response.data, recipientNumber);
      if (error.response.data.error.type === 'OAuthException') {
        return res.status(200).json({ error: true, message: "Your access token is incorrect!" });
      }
    });
};

router.post('/', upload.single('file'), async (req, res) => {
  console.log("sendMessage:", req.body);
  console.log("file", req.file);
  try {
    const { email: email, phoneNumber, filename, file_type, main, reply, createdAt } = req.body;
    const file = req.file;
    console.log(createdAt);
    recipientNumber = phoneNumber;
    if (file !== '' || reply !== '' || main !== '') {
      Contact.findOne({ email, phoneNumber: recipientNumber }).then((user) => {
        if (!user) {
          const contact = new Contact({
            email,
            phoneNumber: recipientNumber,
            allowed: false,
            available: false,
          });
          contact.save()
            .then(() => {
              console.log("save new constact");
            });
        } else {
          if (user.allowed === true) {
            let requestBody = {};
            if (reply !== '') {
              requestBody = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientNumber,
                context: {
                  message_id: reply.message_id,
                },
                type: 'text',
                text: {
                  preview_url: false,
                  body: main || 'reply',
                },
              };
              const message = {
                filename,
                file_type,
                file_url: '',
                main,
                reply
              }
              handleSendMessage(
                email,
                message,
                recipientNumber,
                createdAt,
                requestBody,
                res,
              );
            } else if (filename && file) {
              const uploadDir = path.join(__dirname, '../assets');
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
              }

              const filePath = path.join(uploadDir, filename);
              fs.writeFile(filePath, file.buffer, (err) => {
                if (err) {
                  console.log('error uploading document', err);
                } else {
                  console.log(
                    'Document uploaded successfully',
                    file_type
                  );
                  console.log("type:", file_type);
                  if (file_type === 'application/pdf') {
                    requestBody = {
                      messaging_product: 'whatsapp',
                      to: recipientNumber,
                      type: 'document',
                      document: {
                        link: `https://faceek.duckdns.org/public/${filename}`,
                        caption: main,
                        filename: filename
                      },
                    };
                  } else if (
                    file_type === 'image/jpeg'
                  ) {
                    requestBody = {
                      messaging_product: 'whatsapp',
                      to: recipientNumber,
                      type: 'image',
                      image: {
                        link: `https://faceek.duckdns.org/public/${filename}`,
                        caption: main,
                      },
                    };
                  } else if (
                    file_type === 'video/mp4'
                  ) {
                    requestBody = {
                      messaging_product: 'whatsapp',
                      to: recipientNumber,
                      type: 'video',
                      video: {
                        link:
                          `https://faceek.duckdns.org/public/${filename}`,
                        caption: main,
                      },
                    };
                  }
                  const message = {
                    filename,
                    file_type,
                    file_url: `https://faceek.duckdns.org/public/${filename}`,
                    main,
                    reply
                  }
                  handleSendMessage(
                    email,
                    message,
                    recipientNumber,
                    createdAt,
                    requestBody,
                    res,
                  );
                }
              }
              );
            } else {
              requestBody = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientNumber,
                text: {
                  body: main,
                },
              };
              const message = {
                filename,
                file_type,
                file_url: '',
                main,
                reply
              }
              handleSendMessage(
                email,
                message,
                recipientNumber,
                createdAt,
                requestBody,
                res
              );
            }
          } else {
            user.available = false;
            user.save();
            setTimeout(() => {
              user.available = true;
              user.save();
            }, 10000);
            const requestBody = {
              messaging_product: 'whatsapp',
              to: recipientNumber,
              type: 'template',
              template: {
                name: 'hello_world',
                language: {
                  code: 'en_US',
                },
              },
            };
            sendFacebookMessage(requestBody, email)
              .then((response) => {
                console.log('Allowed Response:', response.data);
              })
              .catch((error) => {
                console.error('Error:', error.response, recipientNumber);
              });
          }
        }
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: true });
  }
});

export default router;