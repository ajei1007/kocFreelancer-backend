import User from '../schema/User.js';
import Contact from '../schema/Contact.js';
import Chat from '../schema/Chat.js';
import Label from "../schema/Label.js";
import Bulk from "../schema/BulkChat.js";
import express from 'express';
import { sendFacebookMessage } from './faceBookMessage/sendMessage.js';

const router = express.Router();

router.post('/label', async (req, res) => {
  console.log(req.body);
  try {
    const data = req.body;
    if (data.email !== "" && data.label !== "") {
      const oldLabel = await Label.findOne({ email: data.email, label: data.label });
      if (oldLabel) {
        const label = await Label.find({ email: data.email });
        res.status(200).json({ error: true, label, message: "This label is exist." })
      } else {
        await new Label({ ...req.body }).save();
        data.phoneNumbers.forEach(async (number) => {
          const contact = await Contact.findOne({ email: data.email, phoneNumber: number });
          if (contact) {
            const oldContact = contact.label;
            oldContact.push(data.label);
            contact.label = oldContact;
            contact.save();
          }
        })
        const label = await Label.find({ email: data.email });
        res
          .status(200)
          .json({ error: false, label, message: 'New label is created' });
      }
    } else {
      res.status(200).json({ error: true, message: "Enter data correctly." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.post('/setlabel', async (req, res) => {
  try {
    const data = req.body;
    const { email, selectPhone, selectLabel } = req.body;
    if (email && selectPhone && selectLabel) {
      const label = await Label.findOne({ email, label: selectLabel });
      if (label) {
        if (!label.phoneNumbers.includes(selectPhone)) {
          label.phoneNumbers.push(selectPhone);
          label.save();
        } else {
          res.status(400).json({ error: true, message: 'Bad data' });
        }
      };
      const contact = await Contact.findOne({ email, phoneNumber: selectPhone });
      if (contact) {
        if (!contact.label.includes(selectLabel)) {
          contact.label.push(selectLabel);
          contact.save();
        } else {
          res.status(400).json({ error: true, message: 'Bad data' });
        }
      }
    };
    const label = await Label.find({ email });
    const contact = await Contact.find({ email });
    res.status(200).json({ success: true, contact, label, message: "action is success" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.post('/number', async (req, res) => {
  try {
    const data = req.body;
    if (data.email !== "" && data.number !== "") {
      const contact = await Contact.findOne({ email: data.email, phoneNumber: data.number });
      if (contact) {
        const oldContact = await Contact.find({ email: data.email });
        res.status(200).json({ success: true, contact: oldContact, message: "This Number is exist." })
      } else {
        await new Contact({
          email: data.email,
          phoneNumber: data.number,
        }).save();
        const contact = await Contact.findOne({ email: data.email, phoneNumber: data.number });
        res
          .status(200)
          .json({ error: false, contact, message: 'This number is saved' });
      }
    } else {
      res.status(200).json({ error: true, message: "Enter data correctly." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.post("/contact", async (req, res) => {
  try {
    const { email, selectPhone } = req.body;
    console.log(email, selectPhone);
    if (email) {
      const contact = await Contact.find({ email });
      if (contact) {
        const promises = contact.map(async (element) => {
          const message = await Chat.find({
            email,
            phoneNumber: element.phoneNumber,
          }).sort({ createdAt: -1 }).limit(1);
          return {
            phoneNumber: element.phoneNumber,
            label: element.label,
            lastMessage: message[0] || null,
          };
        });
        const newContact = await Promise.all(promises);
        if (selectPhone !== "") {
          const msg = await Chat.find({ email, phoneNumber: selectPhone }).sort({ createdAt: -1 })
            .limit(50);
          res.status(200).json({ success: true, contact: newContact, message: msg || null });
        } else {
          res.status(200).json({ success: true, contact: newContact, message: null });
        }
      }
    } else {
      res.status(500).json({ success: true, message: 'send data correctly' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.post("/addcontact", async (req, res) => {
  // console.log("data:", req.body);
  try {
    const { email, content } = req.body;
    if (email && content) {
      content.forEach(async (element) => {
        const label = await Label.findOne({ label: element[2] });
        if (label) {
          if (label.phoneNumbers.includes(element[1])) {
            cosole.log(`${element[1]} is already exist.`);
          } else {
            label.phoneNumbers.push(element[1]);
            label.save()
              .then(() => {
                console.log(`save ${element[1]} successfully`);
              });
          }
        } else {
          await new Label({ email, label: element[2], phoneNumbers: [element[1]] }).save();
          console.log("save new label");
        }
      });
      const updatedLabel = await find({ email });
      res
        .status(200).json({ success: true, label: updatedLabel, message: "Import label successfully" });
    } else {
      res.status(500).json({ success: true, message: 'send data correctly' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.post("/getlabel", async (req, res) => {
  // console.log("email:", req.body);
  try {
    const data = req.body;
    const label = await Label.find({ email: data.email });
    res.status(200).json({ error: false, label, message: "getLabel success!" });
  } catch (err) {
    console.log("err:", err);
    res.status(500).json({ error: true, message: "Interal Server Error." })
  }
});

router.post("/deletelabel", async (req, res) => {
  // console.log("data:", req.body);
  try {
    const { email, label } = req.body.data;
    const deleteLabel = await Label.findOne({ email, label });
    deleteLabel.phoneNumbers.forEach(async (el) => {
      const contact = await Contact.findOne({ email, phoneNumber: el });
      contact.label = contact.label.filter(element => element !== label);
      contact.save();
    })
    const result = await Label.deleteOne({ email, label });
    if (result.deletedCount === 1) {
      const newLabel = await Label.find({ email });
      res.status(200).json({ success: true, label: newLabel, message: `${label} label is deleted.` });
    } else {
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  } catch (err) {
    console.log("err:", err);
    res.status(500).json({ error: true, message: "Interal Server Error." })
  }
});

router.post("/delete/label", async (req, res) => {
  // console.log("data:", req.body);
  try {
    const { email, label, phoneNumber } = req.body.data;
    const changeLabel = await Label.findOne({ email, label });
    if (changeLabel) {
      changeLabel.phoneNumbers = changeLabel.phoneNumbers.filter(element => element !== phoneNumber);
      changeLabel.save().then(() => console.log("ok1"));
    }
    const changeContact = await Contact.findOne({ email, phoneNumber });
    if (changeContact) {
      changeContact.label = changeContact.label.filter(element => element !== label);
      changeContact.save().then(() => console.log("ok"));
    }
    const newLabel = await Label.find({ email });
    console.log(newLabel);
    res.status(200).json({ success: true, label: newLabel, message: `${phoneNumber} is deleted.` });
  } catch (err) {
    console.log("err:", err);
    res.status(500).json({ error: true, message: "Interal Server Error." })
  }
});

router.post('/delete/contact', async (req, res) => {
  console.log("delete in contact:", req.body);
  try {
    const { email, phoneNumber } = req.body;
    const chatDelete = await Chat.deleteMany({ email, phoneNumber });
    console.log(chatDelete);
    const result = await Contact.deleteOne({ email, phoneNumber });
    console.log(result);
    if (result.deletedCount === 1) {
      console.log("delete phone number");
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Interal Server Error." })
  }
})

router.post("/addtemplate", async (req, res) => {
  console.log("addtemplate:", req.body.data);
  try {
    const { email, templateName, textNum } = req.body.data;
    const user = await User.findOne({ email });
    user.template.push([templateName, textNum]);
    console.log("user:", user);
    user.save()
      .then(() => {
        res.status(200).json({ error: false, user, message: "Add new template successfully." });
      })
  } catch (err) {
    res.status(500).json({ error: true, message: "Interval server error." });
  }
});
router.post("/delete/bulk", async (req, res) => {
  console.log("delete bulk", req.body);
  try {
    const { email, createdAt } = req.body;
    const result = await Bulk.deleteOne({ email, createdAt });
    if (result.deletedCount === 1) {
      console.log("delete phone number");
      const bulk = await Bulk.find()
      res.status(200).json({ success: true, bulk });
    } else {
      res.status(200).json({ success: false, message: "Internal server error." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Interval server error." });
  }
})

router.post("/bulkmessage", async (req, res) => {
  console.log("data:", req.body);
  try {
    const { email, label, template, values } = req.body.data;
    const user = await User.findOne({ email });
    const getTemplate = user.template.filter((element) => element[0] === template);
    const user_template = getTemplate[0];
    const data = await Label.findOne({ email, label });
    console.log("template:", user_template);
    const body = [];
    for (let i = 0; i < user_template[1]; i++) {
      body.push({
        type: "text",
        text: values[i],
      })
    }
    if (data) {
      if (data.phoneNumbers) {
        // console.log(data.phoneNumbers);
        data.phoneNumbers.forEach((phone, idx) => {
          // console.log("phonenumber:", phone);
          let requestBody = null;
          if (user_template[1] !== '0') {
            requestBody = {
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template: {
                name: user_template[0],
                language: {
                  code: 'en_US',
                },
                components: [
                  {
                    type: "body",
                    parameters: body
                  },
                ]
              },
            };
          } else {
            requestBody = {
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template: {
                name: template,
                language: {
                  code: 'en_US',
                },
              },
            };
          }
          sendFacebookMessage(requestBody, email)
            .then((response) => {
              console.log(`buld-${idx}`, response.data);
              res.status(200).json({ success: true, message: "sent bulk message" });
            })
            .catch((err) => {
              console.log(`buld-${idx}`, err);
            })
        });
        const bulk = new Bulk({
          email,
          label,
          template,
          createdAt: new Date(),
        });
        bulk.save().then(() => {
          console.log(" sending bulk message is success");
          res.status(200).json({ error: false, bulk, message: `Send bulk message to ${label} successfully.` })
        })
          .catch((err) => {
            res.status(500).json({ error: true, message: "Interal Server Error." })
          })
      }
    }
  } catch (err) {
    console.log("err:", err);
    res.status(500).json({ error: true, message: "Interal Server Error." })
  }
});

router.post("/getbulkmessage", async (req, res) => {
  console.log("data:", req.body);
  try {
    const { email } = req.body.data;
    const bulk = await Bulk.find({ email });
    if (bulk) {
      console.log("bulk", bulk);
      res.status(200).json({ error: false, bulk, message: "Get bulk messages successfully!" })
    } else {
      res.status(200).json({ error: true, message: "No bulk message." })
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: true, message: "Interval server error!" });
  }
});

router.post('/report', async (req, res) => {
  try {
    const email = req.body.email;
    if (email !== "") {
      const chats = await Chat.find({ email });
      const contacts = await Contact.find({ email });
      const label = await Label.find({ email });
      let subscriber = 0;
      let unsubscriber = 0;
      contacts.map(async (contact) => {
        if (contact.allowed) {
          subscriber++;
        } else {
          unsubscriber++;
        }
      })
      if (contacts && chats && label) {
        res.status(200).json({ success: true, report: { chats: chats.length, label: label.length, contacts: contacts.length, subscriber, unsubscriber }, message: "success." })
      } else {
        res
          .status(200)
          .json({ error: false, message: 'occur error' });
      }
    } else {
      res.status(200).json({ error: true, message: "error: not find." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});


export default router;