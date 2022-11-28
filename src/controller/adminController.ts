import { Request, Response, NextFunction } from 'express';
import { option, GeneratePassword, GenerateSalt, GenerateOTP, GenerateSignature, adminSchema, vendorSchema } from '../utils/index';
import {UserAttributes, UserInstance} from '../model/userModel';
import {v4 as uuidv4} from 'uuid';
import { FromAdminMail, userSubject } from '../config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { VendorAttributes, VendorInstance } from '../model/vendorModel';

 /**===================================== REGISTER ADMIN (NORMAL ADMIN) ===================================== **/
export const AdminRegister = async(req:JwtPayload, res:Response)=>{
    try{
        const id = req.user.id;
        const { email, phone, password, firstName, lastName, address } = req.body;
        const uuiduser = uuidv4();

        const validateResult = adminSchema.validate(req.body, option)
        if(validateResult.error) {
            res.status(400).json({
                Error: validateResult.error.details[0].message
            })
        }
        //Generate salt
        const salt = await GenerateSalt();
        const adminPassword = await GeneratePassword(password, salt);

        //Generate OTP
        const {otp, expiry} = GenerateOTP();

        //check if the Admin exists
        const Admin = await UserInstance.findOne({where: { id: id } }) as unknown as UserAttributes; /*this means, where email is equal to email 
        because we're using sequelize as database. If we're using mongoose it would be written as {email}*/

        if(Admin.email === email){
            return res.status(400).json({
                message: "Email already exist",
            });
        };

        if(Admin.phone === phone){
            return res.status(400).json({
                message: "Phone number already exist",
            });
        }

        //Create Admin
        if(Admin.role === "superadmin"){
            await UserInstance.create({
                id: uuiduser,
                email,
                password: adminPassword,
                firstName,
                lastName,
                salt,
                address,
                phone,
                otp,
                otp_expiry: expiry,
                lng: 0,       /*lng & lat (longitude & latitude)bcos we'll want to know the location of the user */
                lat: 0,
                verified: true,
                role: "admin"

            });   

            //Re-check if the admin exist
        const Admin = await UserInstance.findOne({ where: { email: email } }) as unknown as UserAttributes    
        /*this means it doesn't know the type of userinstance but it knows that it'll come back as object */

            //Generate a signature for admin
        let signature = await GenerateSignature({
            id: Admin.id,
            email: Admin.email,
            verified: Admin.verified
        });

            return res.status(201).json({
                message: "Admin created successfully",
                signature,
                verified: Admin.verified
            })
        }

        return res.status(400).json({
            message: "Admin already exist!"
        })

    } catch(err){
        res.status(500).json({
            Error: "Internal server Error",
            route: "/admins/create-super-admin"
        })
    }
}

/**===================================== REGISTER SUPER ADMIN ===================================== **/
export const SuperAdmin = async(req:JwtPayload, res:Response)=>{
    try{
        const { email, phone, password, firstName, lastName, address } = req.body;
        const uuiduser = uuidv4();

        const validateResult = adminSchema.validate(req.body, option)
        if(validateResult.error) {
            return res.status(400).json({
                Error: validateResult.error.details[0].message
            })
        }
        //Generate salt
        const salt = await GenerateSalt();
        const adminPassword = await GeneratePassword(password, salt);

        //Generate OTP
        const {otp, expiry} = GenerateOTP();

        //check if the Admin exists
        const Admin = await UserInstance.findOne({where: { email: email } }) as unknown as UserAttributes; /*this means, where email is equal to email 
        because we're using sequelize as database. If we're using mongoose it would be written as {email}*/

        //Create SuperAdmin
        if(!Admin){
            await UserInstance.create({
                id: uuiduser,
                email,
                password: adminPassword,
                firstName,
                lastName,
                salt,
                address,
                phone,
                otp,
                otp_expiry: expiry,
                lng: 0,       /*lng & lat (longitude & latitude)bcos we'll want to know the location of the user */
                lat: 0,
                verified: true,
                role: "superadmin"

            });   

            //Re-check if the admin exist
        const Admin = await UserInstance.findOne({ where: { email: email } }) as unknown as UserAttributes    
        /*this means it doesn't know the type of userinstance but it knows that it'll come back as object */

            //Generate a signature for admin
        let signature = await GenerateSignature({
            id: Admin.id,
            email: Admin.email,
            verified: Admin.verified
        });

            return res.status(201).json({
                message: "SuperAdmin created successfully",
                signature,
                verified: Admin.verified
            })
        }

        return res.status(400).json({
            message: "SuperAdmin already exist!"
        })

    } catch(err){
        res.status(500).json({
            Error: "Internal server Error",
            route: "/admins/signup"
        })
    }
}

        /**===================================== CREATE VENDOR ===================================== **/
export const createVendor = async(req:JwtPayload, res:Response)=>{
    try{
        const id = req.user.id;
        const{name, restaurantName, pincode, phone, address, email, password, coverImage} = req.body;
        const uuidvendor = uuidv4();
        const validateResult = vendorSchema.validate(req.body, option)
        if(validateResult.error) {
            res.status(400).json({
                Error: validateResult.error.details[0].message
            })
        }
    //Generate salt
    const salt = await GenerateSalt();
    const vendorPassword = await GeneratePassword(password, salt);

    //check if the Vendor exists
    const Vendor = await VendorInstance.findOne({where: { email: email } }) as unknown as VendorAttributes; /*this means, where email is equal to email 
    because we're using sequelize as database. If we're using mongoose it would be written as {email}*/

        const Admin = (await UserInstance.findOne({where: { id: id }})) as unknown as UserAttributes;
    if(Admin.role === 'admin' || Admin.role === 'superadmin'){
     if(!Vendor){
        const createVendor = await VendorInstance.create({
                id: uuidvendor,
                name,
                restaurantName,
                pincode,
                phone,
                address,
                email,
                password: vendorPassword,
                salt,
                serviceAvailable: false,
                role: "vendor",
                rating: 0,
                coverImage: ""
        });
        return res.status(201).json({
            message: "Vendor created successfully",
            createVendor
        });
     } 
     return res.status(400).json({
        message: "Vendor already exist",
    });
}
    return res.status(400).json({
        message: "unauthorised",
    });
    
}catch(err){
    res.status(500).json({
        Error: "Internal server Error",
        route: "/admins/create-vendors"
    })
}
};