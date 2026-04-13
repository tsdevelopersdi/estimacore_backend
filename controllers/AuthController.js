import Users from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ----------------------------------------------------------
//                  === AUTH MANAGAMENET ===
// ----------------------------------------------------------

// >>> REGISTER NEW USER
export const RegisterUser = async (req, res) => {
  const { name, email, password, nik, status, role, department } = req.body;
  // if (password !== confPassword)
  //   return res.status(400).json("password are not match!");
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);
  try {
    await Users.create({
      name: name,
      password: hashedPassword,
      email: email,
      role: "user", // 🔥 Force default role to 'user' for security
      nik: nik,
      status: status,
      department: department,
    });
    return res.status(200).json("register success !");
  } catch (error) {
    console.log(error);
  }
};

// >>> LOGIN USER
export const LoginUser = async (req, res) => {
  try {
    const user = await Users.findAll({
      where: {
        email: req.body.email,
      },
    });
    if (user.length > 0) {
      const match = await bcrypt.compare(req.body.password, user[0].password);
      if (!match) return res.status(400).json("email or password is wrong!");
      const userId = user[0].id;
      const name = user[0].name;
      const email = user[0].email;
      const role = user[0].role;
      const status = user[0].status;
      const accessToken = jwt.sign(
        { userId, name, email, role, status },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "24h",
        },
      );
      const refreshToken = jwt.sign(
        { userId, name, email, role, status },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "7d",
        },
      );
      await Users.update(
        { refresh_token: refreshToken },
        {
          where: {
            id: userId,
          },
        },
      );
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: 600 * 1000,
        secure: true, // Changed to false for HTTP support
        // secure: false, // Changed to false for HTTP support
        sameSite: "lax",
        domain: "estimacore.solusidaya.id",
        path: "/"
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: true, // Changed to false for HTTP support
        // secure: false, // Changed to false for HTTP support
        sameSite: "lax",
        domain: "estimaclaim.solusidaya.id",
        path: "/"
      });
      res.json({
        success: true,
        user: {
          id: userId,
          name: name,
          email: email,
          role: role,
          status: status,
        },
      });
    } else return res.status(404).json("email or password is wrong!");
  } catch (error) {
    return res.status(400).json(error);
  }
};

// >>> LOGOUT USER
export const LogoutUser = async (req, res) => {
  // Read from cookie first, fallback to request body
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) return res.sendStatus(204);
  const user = await Users.findAll({
    where: {
      refresh_token: refreshToken,
    },
  });
  if (!user[0]) return res.sendStatus(403);
  const userId = user[0].id;
  await Users.update(
    {
      refresh_token: null,
    },
    {
      where: {
        id: userId,
      },
    },
  );
  res.clearCookie("accessToken", { httpOnly: true, sameSite: "lax" });
  res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax" });
  return res.status(200).json("success logout!");
};

// >>> DELETE USER
export const DeleteUser = async (req, res) => {
  const userId = req.params.id;
  await Users.destroy({
    where: {
      id: userId,
    },
  });
  return res.status(200).json("success delete user!");
};
