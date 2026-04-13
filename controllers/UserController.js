import Users from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ----------------------------------------------------------
//                  === USER MANAGAMENET ===
// ----------------------------------------------------------

// >>> GET ALL USER
export const getUsers = async (req, res) => {
  try {
    // const users = await Users.findAll({
    //   attributes: ["id", "name", "email", "role"],
    // });
    const users = await Users.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

export const getUserById = async (req, res) => {
  console.log("=== USER email ===", req.params.id);
  try {
    const user = await Users.findOne({
      where: {
        email: req.params.id,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await Users.update(req.body, {
      where: {
        id: req.params.id,
      },
    });
    if (req.body.password) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      await Users.update({ password: hashedPassword }, {
        where: {
          id: req.params.id,
        },
      });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

