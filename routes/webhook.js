import { executePayload } from '../utils/executePayload.js';
import User from '../schema/User.js';
import Chat from '../schema/Chat.js';
import Contact from '../schema/Contact.js';
import { io, connectedUsers } from "../app.js";
import { getUrl } from './faceBookMessage/sendMessage.js';
import fs from 'fs';

const getShortDateTime = (today) => {
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Adding 1 because months are zero-indexed
  const day = today.getDate().toString().padStart(2, '0');
  const hours = today.getHours().toString().padStart(2, '0');
  const minutes = today.getMinutes().toString().padStart(2, '0');
  const seconds = today.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export const getVerifyData = async (req, res) => {
  try {
    let token = req.query['hub.verify_token'];
    let chellange = req.query['hub.challenge'];
    let mode = req.query['hub.mode'];

    if (chellange != null && mode != null && token != null && token == '02141967') {
      res.send(challenge);
    } else {
      res.send('parameter no Matched');
    }
  } catch (err) {
    console.log(err);
    res.send('EVENT RECEIVED');
  }
};

function findSocketId(email) {
  for (const [socketId, owner] of connectedUsers) {
    if (owner.email === email) {
      return socketId;
    }
  }
}

export const receiveMessage = async (req, res) => {
  try {
    const data = req.body;
    const { phone_no_id, from, msg_id, msg_timestamp, msg_text, msg_emoji, react_msg_id, media, media_type, media_id, msg_reply, from_reply, buttonText } = executePayload(data);

    if (phone_no_id) {
      const user = await User.findOne({ phoneId: phone_no_id });
      const reply_chat = msg_reply ? await Chat.findOne({ message_id: msg_reply }) : "";
      console.log("button:", buttonText);
      if (user) {
        if (msg_text !== "" || (buttonText && buttonText !== "Stop promotions") || media !== '') {
          Contact.findOne({ email: user.email, phoneNumber: from })
            .then((contact) => {
              console.log("contact:", contact);
              if (contact) {
                contact.allowed = true;
                contact.available = true;
                contact.save().then(() => {
                  console.log("the allowed action is oK");
                })
              }
            });
        }
        const createdAt = new Date();
        if (media_id) {
          getUrl(media_id, user.email)
            .then((response) => {
              console.log("data:", response.data);
              let fileName;
              const date = getShortDateTime(createdAt);
              console.log("msg_type:", media_type);
              if (media_type === "image/jpeg") {
                fileName = "image " + date + ".jpg";
              } else if (media_type === "application/pdf") {
                fileName = "document " + date + ".pdf";
              } else if (media_type === "video/mp4") {
                fileName = "video " + date + ".avi";
              }
              fs.writeFile(
                `./assets/whatsapp ${fileName}`,
                response.data,
                (err) => {
                  if (err) {
                    console.log('error uploading document', err);
                  } else {
                    const chat = new Chat({
                      email: user.email || "111",
                      phoneNumber: from,
                      isComing: true,
                      message_id: msg_id,
                      createdAt,
                      msg_timestamp,
                      message: {
                        filename: fileName,
                        file: media,
                        file_type: media_type,
                        file_id: media_id,
                        reply: reply_chat,
                        main: msg_text,
                        file_url: `https://faceek.duckdns.org/public/whatsapp ${fileName}`,
                      },
                    });
                    console.log("new message:", chat);
                    const socketId = findSocketId(user.email);
                    console.log("socketId:", socketId);
                    if (socketId) {
                      chat
                        .save()
                        .then(() => {
                          console.log('New Received message saved!');
                          io.to(socketId).emit('receive_message', chat);
                          return res.status(200).send('OK');
                        })
                        .catch((err) => {
                          console.log('Erro2222r:', err);
                          return res.status(404);
                        });
                    } else {
                      console.log(`User with email ${user.email} not found.`);
                      return res.status(404);
                    }
                  }
                }
              );
            })
        } else {
          let main_text = "";
          if (buttonText !== "") {
            main_text = buttonText;
          } else {
            main_text = msg_text;
          }
          const chat = new Chat({
            email: user.email || "111",
            phoneNumber: from,
            isComing: true,
            message_id: msg_id,
            createdAt,
            msg_timestamp,
            message: {
              filename: "",
              file: media,
              file_type: media_type,
              file_id: media_id,
              reply: reply_chat,
              main: main_text,
              file_url: '',
            },
          });
          console.log("new message:", chat);
          const socketId = findSocketId(user.email);
          console.log("socketId:", socketId);
          if (socketId) {
            console.log("emit text:", chat);
            chat
              .save()
              .then(() => {
                console.log('New Received message saved!');
                io.to(socketId).emit('receive_message', chat);
                return res.status(200).send('OK');
              })
              .catch((err) => {
                console.log('Erro2222r:', err);
                return res.status(404);
              });
          } else {
            console.log(`User with email ${user.email} not found.`);
            return res.status(404);
          }
        }

      }
    }
  } catch (err) {
    console.log(err);
    return res.status(404);
  }
};
