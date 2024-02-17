import { getProfileInfo } from '../utils/googleOAuth.js';

export const googleLogin = async (req, res) => {
  try {
    const code = req.body.code;
    const profile = await getProfileInfo(code);

    const user = {
      googleId: profile.sub,
      name: profile.name,
      firstName: profile.given_name,
      lastName: profile.family_name,
      email: profile.email,
      profilePic: profile.picture,
    };

    res.send({ user });
  } catch (e) {
    console.log(e);
    res.status(401).send();
  }
};

export const login = async (req, res) => {
  try {
    console.log(req.body);
  } catch (e) {
    console.log(e);
    res.status(200).json('failed');
  }
};
