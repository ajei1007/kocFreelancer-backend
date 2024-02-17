import Chat from '../schema/Chat.js';
import Contact from '../schema/Contact.js';
import { sendFacebookMessage } from './faceBookMessage/sendMessage.js';
import fs from 'fs';
import express from 'express';

const router = express.Router();

let recipientNumber = "";

const handleSendMessage = (
  email,
  message,
  recipientNumber,
  createdAt,
  requestBody,
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
              io.emit('receive_message', message[0]);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((error) => {
      console.log('Allowed Error:', error.response, recipientNumber);
    });
};

export const sendMessage = (socket) => {
  socket.on('send_message', async (data) => {
    const { email: email, message, selectedPhone, createdAt } = data;
    recipientNumber = selectedPhone;
    console.log("input:", data);
    if (message.file !== '' || message.reply !== '' || message.main !== '') {
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
            if (message.reply !== '') {
              requestBody = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientNumber,
                context: {
                  message_id: message.reply.message_id,
                },
                type: 'text',
                text: {
                  preview_url: false,
                  body: message.main || 'reply',
                },
              };
              handleSendMessage(
                email,
                message,
                recipientNumber,
                createdAt,
                requestBody,
              );
            } else if (message.filename && message.file && message.fileUrl) {
              fs.writeFile(
                `./assets/${message.filename}`,
                message.file,
                (err) => {
                  if (err) {
                    console.log('error uploading document', err);
                  } else {
                    console.log(
                      'Document uploaded successfully',
                      message.file_type
                    );
                    console.log("type:", message.file_type);
                    if (message.file_type === 'application/pdf') {
                      requestBody = {
                        messaging_product: 'whatsapp',
                        to: recipientNumber,
                        type: 'document',
                        document: {
                          link: `https://faceek.duckdns.org/public/${message.filename}`,
                          caption: message.main,
                          filename: message.filename
                        },
                      };
                    } else if (
                      message.file_type === 'image/jpeg'
                    ) {
                      requestBody = {
                        messaging_product: 'whatsapp',
                        to: recipientNumber,
                        type: 'image',
                        image: {
                          link: `https://faceek.duckdns.org/public/${message.filename}`,
                          caption: message.main,
                        },
                      };
                    } else if (
                      message.file_type === 'video/mp4'
                    ) {
                      requestBody = {
                        messaging_product: 'whatsapp',
                        to: '380 95 577 9971',
                        type: 'video',
                        video: {
                          link:
                            `https://faceek.duckdns.org/public/${message.filename}`,
                          caption: message.main,
                        },
                      };
                    }
                    message.file_url = `https://faceek.duckdns.org/public/${message.filename}`;
                    handleSendMessage(
                      email,
                      message,
                      recipientNumber,
                      createdAt,
                      requestBody,
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
                  body: message.main,
                },
              };
              handleSendMessage(
                email,
                message,
                recipientNumber,
                createdAt,
                requestBody,
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
  });
};
