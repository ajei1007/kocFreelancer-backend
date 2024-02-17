import bcrypt from 'bcrypt';
import User from '../schema/User.js';
import generateTokens from '../utils/generateTokens.js';
import {
  signUpBodyValidation,
  logInBodyValidation,
} from '../utils/validationSchema.js';
import express from 'express';
import { googleLogin } from '../controllers/auth.js';

const router = express.Router();

router.post('/google', googleLogin);

router.post('/signup', async (req, res) => {
  try {
    console.log('signup input data:', req.body);
    const { error } = signUpBodyValidation(req.body);
    if (error) {
      console.log(error.details[0].message);
      return res
        .status(400)
        .json({ error: true, message: error.details[0].message });
    }

    const user = await User.findOne({ email: req.body.email });
    if (user)
      return res
        .status(400)
        .json({ error: true, message: 'User with given email already exist' });

    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    await new User({ ...req.body, password: hashPassword }).save();

    res
      .status(201)
      .json({ error: false, message: 'Account created sucessfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    // console.log('login data:', req.body);
    const { error } = logInBodyValidation(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: true, message: error.details[0].message });

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      console.log("can't find");
      return res
        .status(401)
        .json({ error: true, message: 'Invalid email or password' });
    }

    const verifiedPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!verifiedPassword)
      return res
        .status(401)
        .json({ error: true, message: 'Invalid email or password' });

    const { accessToken, refreshToken } = await generateTokens(user);
    user.accessToken = accessToken;
    user.save()
      .then(() => {
        console.log("user.email is login");
      })
    if (user.roles === 'super') {
      const users = await User.find({ roles: 'admin' });
      res.status(200).json({
        error: false,
        accessToken,
        refreshToken,
        user,
        users,
        message: 'Logged in sucessfully',
      });
    } else {
      if (!user.approved) {
        res.status(200).json({
          error: true,
          message: "You are not approved!"
        });
      } else {
        res.status(200).json({
          error: false,
          accessToken,
          refreshToken,
          user,
          message: 'Logged in sucessfully',
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.post('/login/token', async (req, res) => {
  try {
    // console.log('login data:', req.body);
    const { accessToken } = req.body;
    const user = await User.findOne({ accessToken });
    if (!user) {
      console.log("can't find");
      return res
        .status(401)
        .json({ error: true, message: 'your access token is incorrect.' });
    } else {
      if (user.roles === 'super') {
        const users = await User.find({ roles: 'admin' });
        res.status(200).json({
          error: false,
          accessToken,
          user,
          users,
          message: 'Logged in sucessfully',
        });
      } else {
        res.status(200).json({
          error: false,
          accessToken,
          user,
          message: 'Logged in sucessfully',
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
  }
});

router.get('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(token, authHeader, 'req');
    res.status(200).json({
      error: false,
      message: 'logout successfully.',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: 'Internal Server Error!' });
  }
});

router.post('/profile', async (req, res) => {
  console.log(req.body);
  try {
    const userData = req.body;
    const user = await User.findOne({ email: userData.data.email });
    if (user) {
      user.email = userData.data.email;
      user.firstName = userData.data.firstName;
      user.lastName = userData.data.lastName;
      user.avatar = userData.avatar;
      user.save();
      return res.status(200).json({
        error: false,
        user: user,
        message: 'Profile chagne successfully',
      });
    } else {
      return res.status(401).json({ error: true, message: 'email is invalid' });
    }
  } catch (err) {
    res.status(500).json({ error: true, message: 'Internal Server Error!' });
  }
});

router.post('/account', async (req, res) => {
  console.log(req.body);
  try {
    const { email, data } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      user.accountId = data.accountId;
      user.phoneId = data.phoneId;
      user.accountToken = data.accessToken;
      user.save().then(() => {
        console.log('accountData saved');
      });
      res.status(200).json({
        error: false,
        user,
      });
    } else {
      res.status(401).json({ error: true });
    }
  } catch (err) {
    res.status(500).json({ error: true, message: 'Internal Server Error!' });
  }
});

router.post('/allow', async (req, res) => {
  console.log('why:', req.body);
  try {
    const email = req.body.email;
    const user = await User.findOne({ email });
    if (user) {
      user.approved = true;
      user.save().then(() => {
        User.find({ roles: 'admin' })
          .then((users) => {
            res.status(200).json({ error: false, users, message: `${email} is approved.` });
          })
          .catch((err) => {
            console.log(err);
          });
      });
    } else {
      res.status(500).json({ error: true, message: 'Internal Server Error!' });
    }
  } catch (err) {
    res.status(500).json({ error: true, message: 'Internal Server Error!' });
  }
});

router.post('/notallow', async (req, res) => {
  console.log('why:', req.body);
  try {
    const email = req.body.email;
    const user = await User.findOne({ email });
    if (user) {
      user.approved = false;
      user.save().then(() => {
        User.find({ roles: 'admin' })
          .then((users) => {
            res.status(200).json({ error: false, users, message: `${email} is blocked.` });
          })
          .catch((err) => {
            console.log(err);
          });
      });
    } else {
      res.status(500).json({ error: true, message: 'Internal Server Error!' });
    }
  } catch (err) {
    res.status(500).json({ error: true, message: 'Internal Server Error!' });
  }
});

router.post('/deleteuser', async (req, res) => {
  console.log('delete:', req.body);
  try {
    const email = req.body.email;
    const result = await User.deleteOne({ email })
    if (result.deletedCount === 1) {
      console.log("found");
      User.find({ roles: 'admin' })
        .then((users) => {
          res.status(200).json({ error: false, users, message: `${email} is deleted.` });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  } catch (err) {
    res.status(500).json({ error: true, message: 'Internal Server Error!' });
  }
});

export default router;
