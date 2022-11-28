import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FoodAttributes, FoodInstance } from "../model/foodModel";
import { VendorInstance, VendorAttributes } from "../model/vendorModel";
import {
  GenerateSignature,
  option,
  validatePassword,
  loginSchema,
  vendorSchema,
  updateVendorSchema,
} from "../utils";
import { v4 as uuidv4 } from "uuid";
import Vendor from "../routes/Vendor";

/**===================================== VENDOR LOGIN ===================================== **/
export const vendorLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const validateResult = loginSchema.validate(req.body, option);
    if (validateResult.error) {
      return res.status(400).json({
        Error: validateResult.error.details[0].message,
      });
    }
    //check if the vendor exist
    const Vendor = (await VendorInstance.findOne({
      where: { email: email },
    })) as unknown as VendorAttributes;

    if (Vendor) {
      const validation = await validatePassword(
        password,
        Vendor.password,
        Vendor.salt
      ); /*can equally use bcrypt.compare() */
      console.log(validation);
      if (validation) {
        //Generate signature for the vendor
        let signature = await GenerateSignature({
          id: Vendor.id,
          email: Vendor.email,
          serviceAvailable: Vendor.serviceAvailable,
        });
        return res.status(200).json({
          message: "You have successfully logged in",
          signature,
          email: Vendor.email,
          serviceAvailable: Vendor.serviceAvailable,
          role: Vendor.role,
        });
      }
    }
    return res.status(400).json({
      Error: "Wrong Username or password or not a verified vendor",
    });
  } catch (err) {
    res.status(500).json({
      Error: "Internal server Error",
      route: "/vendors/login",
    });
  }
};

/**===================================== VENDOR ADD FOOD ===================================== **/
export const createFood = async (req: JwtPayload, res: Response) => {
  try {
    const id = req.vendor.id;
    const { name, description, category, foodType, readyTime, price, image } =
      req.body;
    //check if the vendor exist
    const vendor = (await VendorInstance.findOne({
      where: { id: id },
    })) as unknown as VendorAttributes;

    const foodid = uuidv4();

    if (vendor) {
      const createFood = await FoodInstance.create({
        id: foodid,
        name,
        description,
        category,
        foodType,
        readyTime,
        price,
        rating: 0,
        vendorId: id,
        image: req.file.path,
      });

      console.log(createFood)
      return res.status(201).json({
        message: "Food added successfully",
        createFood,
      });
    }
  } catch (err) {
    res.status(500).json({
      Error: "Internal server Error",
      route: "vendors/create-food",
    });
  }
};

/**===================================== GET VENDOR PROFILE ===================================== **/
export const VendorProfile = async (req: JwtPayload, res: Response) => {
  try {
    const id = req.vendor.id;

    //check if the vendor exist
    const Vendor = (await VendorInstance.findOne({
      where: { id: id },
      include: [
        {
          model: FoodInstance,
          as: "food",
          attributes: [
            "id",
            "name",
            "description",
            "category",
            "foodType",
            "readyTime",
            "price",
            "rating",
            "vendorId",
          ],
        },
      ],
    })) as unknown as VendorAttributes;

    return res.status(200).json({
      Vendor,
    });
  } catch (err) {
    res.status(500).json({
      Error: "Internal server Error",
      route: "/vendors/get-profile",
    });
  }
};

/**===================================== VENDOR DELETE FOOD ===================================== **/
export const deleteFood = async (req: JwtPayload, res: Response) => {
  try {
    const id = req.vendor.id;
    const foodid = req.params.foodid;

    //check if the vendor exist
    const Vendor = (await VendorInstance.findOne({
      where: { id: id },
    })) as unknown as VendorAttributes;

    if (Vendor) {
      const deletedFood = await FoodInstance.destroy({ where: { id: foodid } });

      return res.status(200).json({
        message: "You have successfully deleted food",
        deletedFood,
      });
    }
  } catch (err) {
    res.status(500).json({
      Error: "Internal server Error",
      route: "/vendors/delete-food",
    });
  }
};

/**====================================== UPDATE VENDOR PROFILE ===================================== **/
export const updateVendorProfile = async (req: JwtPayload, res: Response) => {
  try {
    const id = req.vendor.id;
    const { name, phone, address, coverImage } = req.body;
    //Joi validation
    const validateResult = updateVendorSchema.validate(req.body, option);
    if (validateResult.error) {
      res.status(400).json({
        Error: validateResult.error.details[0].message,
      });
    }
    //check if the vendor is a registered vendor
    const User = (await VendorInstance.findOne({
      where: { id: id },
    })) as unknown as VendorAttributes;
    if (!Vendor) {
      return res.status(400).json({
        Error: "You are not authorised to update your profile",
      });
    }
    //Update Record
    const updatedUser = (await VendorInstance.update(
      {
        name,
        phone,
        address,
        coverImage: req.file?.path,
      },
      { where: { id: id } }
    )) as unknown as VendorAttributes;

    if (updatedUser) {
      const Vendor = (await VendorInstance.findOne({
        where: { id: id },
      })) as unknown as VendorAttributes;
      return res.status(200).json({
        message: "Profile successfully updated",
        Vendor,
      });
    }
    return res.status(400).json({
      Error: "Error occured",
    });
  } catch (err) {
    return res.status(500).json({
      Error: "Internal server Error",
      route: "/users/update-profile",
    });
  }
};
