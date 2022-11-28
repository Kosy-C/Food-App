import { Request, Response, NextFunction } from 'express';
import {registerSchema, option, GeneratePassword, GenerateSalt, GenerateOTP, onRequestOTP, emailHtml, mailSent, GenerateSignature,
     verifySignature, loginSchema, validatePassword } from '../utils/index';
import {UserAttributes, UserInstance} from '../model/userModel';
import {v4 as uuidv4} from 'uuid';
import { FromAdminMail, userSubject } from '../config';
import jwt, { JwtPayload } from 'jsonwebtoken';


/**===================================== Register User ===================================== **/
export const Register = async(req: Request, res: Response, next: NextFunction) =>{
    try{
        const { email, password, phone, confirm_password } = req.body;
        const uuiduser = uuidv4();

        const validateResult = registerSchema.validate(req.body, option)
        if(validateResult.error) {
            res.status(400).json({
                Error: validateResult.error.details[0].message
            })
        }
        //Generate salt
        const salt = await GenerateSalt();
        const userPassword = await GeneratePassword(password, salt);

        //Generate OTP
        const {otp, expiry} = GenerateOTP();

        //check if the user exists
        const User = await UserInstance.findOne({where: { email: email } }) /*this means, where email is equal to email 
        because we're using sequelize as database. If we're using mongoose it would be written as {email}*/

        //Create User
        if(!User){
            await UserInstance.create({
                id: uuiduser,
                email,
                password: userPassword,
                firstName: '',
                lastName: '',
                salt,
                address: '',
                phone,
                otp,
                otp_expiry: expiry,
                lng: 0,       /*lng & lat (longitude & latitude)bcos we'll want to know the location of the user */
                lat: 0,
                verified: false,
                role: "user"
            });   

            //Send Otp to user
            await onRequestOTP(otp, phone);

            //send Email to user
            const html = emailHtml(otp)
            await mailSent(FromAdminMail, email, userSubject, html) ;  /*we'll create our html inside the utils folder */



            //check if user exist
        const User = await UserInstance.findOne({
            where: { email: email } 
        }) as unknown as UserAttributes    /*this means it doesn't know the type of userinstance but it knows that it'll come back as object */

            //Generate a signature for user
        let signature = await GenerateSignature({
            id: User.id,
            email: User.email,
            verified: User.verified
        });


            return res.status(201).json({
                message: "User created successfully Check your email or phone for OTP verification",
                signature,
                verified: User.verified
            })
        }

        return res.status(400).json({
            message: "User already exist!"
        })

    } catch(err){
        res.status(500).json({
            Error: "Internal server Error",
            route: "/users/signup"
        })
    }
}

            /**===================================== Verify Users ===================================== **/
    export const verifyUser = async(req:Request, res:Response)=>{
        try{
            //users/verify/id
            const token = req.params.signature
            const decode = await verifySignature(token);

            //check if the user is a registered user
        const User = await UserInstance.findOne({
            where: { email: decode.email } }) as unknown as UserAttributes

            if(User){
                const {otp} = req.body;
                if(User.otp === parseInt(otp) && User.otp_expiry >= new Date()){
                    const updatedUser = await UserInstance.update({
                        verified: true
                    }, {where: { email: decode.email } }) as unknown as UserAttributes

                    //Regenerate a new signature
                    let signature = await GenerateSignature({
                        id:  updatedUser.id,
                        email:  updatedUser.email,
                        verified:  updatedUser.verified
                    });

                    if(updatedUser){
                        const User = (await UserInstance.findOne({
                            where: {email: decode.email }, 
                        })) as unknown as UserAttributes;

                        return res.status(200).json({
                            message: "Your account has been verified successfully",
                            signature,
                            verified: User.verified
                        })
                    }        
                }
            }

            return res.status(400).json({
                Error: "Invalid credentials or OTP expired",
            })

        } catch(err){
            res.status(500).json({
                Error: "Internal server Error",
                route: "/users/verify"
            })
        }
    };

     /**===================================== Login Users ===================================== **/
export const Login = async(req:Request, res:Response)=>{
    try{
        const { email, password } = req.body;
        const validateResult = loginSchema .validate(req.body, option);
        if(validateResult.error){
            return res.status(400).json({
                Error: validateResult.error.details[0].message,
            });
        }
        //check if the user exist
        const User = (await UserInstance.findOne({
            where: { email: email },
        })) as unknown as UserAttributes;

        if(User.verified === true){
           const validation = await validatePassword(password, User.password, User.salt)  /*can equally use bcrypt.compare() */
            if(validation){
                //Generate signature for the user
                let signature = await GenerateSignature({
                    id: User.id,
                    email: User.email,
                    verified: User.verified
                });
                return res.status(200).json({
                    message: "You have successfully logged in",
                    signature,
                    email: User.email,
                    verified: User.verified,
                })
            }
        }
        res.status(400).json({
            Error: "Wrong Username or password"
        })
    } catch(err){
        res.status(500).json({
            Error: "Internal server Error",
            route: "/users/login",
        });
    }
}

          /**===================================== Resend OTP ===================================== **/ 
export const resendOTP = async(req:Request, res:Response)=>{
    try{
        const token = req.params.signature;
        const decode = await verifySignature(token);

        //check if the user is a registered user
        const User = (await UserInstance.findOne({
            where: { email: decode.email },
        })) as unknown as UserAttributes;

    if(User){
            //Generate OTP
            const { otp, expiry } = GenerateOTP();
            const updatedUser = (await UserInstance.update(
                {
                    otp, 
                    otp_expiry: expiry,
                },
                { where: { email: decode.email }, 
            })) as unknown as UserAttributes;
         

        if(updatedUser){
            const User = (await UserInstance.findOne({
                where: { email: decode.email },
            })) as unknown as UserAttributes;
            //send otp to user
            await onRequestOTP(otp,  User.phone);

            //send Mail to user
            const html = emailHtml(otp);
            await mailSent(FromAdminMail,  User.email, userSubject, html);

            return res.status(200).json({
               message: "OTP resend to registered phone number and email",
            });
        }
    }

    } catch(err){
        res.status(500).json({
            Error: "Internal server Error",
            route: "/resend-otp/:signature"
        })
    }
}

        /**===================================== PROFILE ===================================== **/ 
    export const getAllUsers = async(req:Request, res:Response)=>{
        // try{
        //     const users = await UserInstance.findAll({})
        //     return res.status(200).json({
        //         message: "You have successfullu retrieved all users",
        //         users
        //     })
            try{
                const limit = req.query.limit as number | undefined
                const users = await UserInstance.findAndCountAll({
                    limit: limit
                })
                return res.status(200).json({
                    message: "You have successfully retrieved all users",
                    Count: users.count,
                    Users: users.rows
                })
        } catch(err){
            return res.status(500).json({
                Error: "Internal server Error",
                route: "/users/get-all-users",
            })
        }
    }

            /**=====================================    GET SINGLE USER ===================================== **/ 
    export const getSingleUser = async(req:JwtPayload, res: Response)=>{              /*singleuser is mostly used in the user's dashboard */
        try{
            const id = req.user.id
            
            //find the user by id
            const User = await UserInstance.findOne({
                where: {id: id} 
            }) as unknown as UserAttributes

            if(User){
                return res.status(200).json({
                    User
                })
            }
            return res.status(400).json({
                message: "User not found"
            })

        } catch(err){
            return res.status(500).json({
                Error: "Internal server Error",
                route: "/users/get-user"
            })
        }
    }

            /**====================================== UPDATE USER PROFILE ===================================== **/ 
    export const updateUserProfile = async(req: JwtPayload, res: Response)=>{
        try{
            const id = req.user.id;
            const {firstName, lastName, address, phone} = req.body
    //Joi validation
    const validateResult = registerSchema.validate(req.body, option)
        if(validateResult.error) {
            res.status(400).json({
                Error: validateResult.error.details[0].message
            })
        }
//check if the user is a registered user
const User = (await UserInstance.findOne({where: { id: id }})) as unknown as UserAttributes;
    if(!User){
        return res.status(400).json({
            Error: "You are not authorised to update your profile"
        })
    }
    //Update Record
    const updatedUser = await UserInstance.update(
        {
            firstName,
            lastName,
            address,
            phone,
        }, { where: { id: id } }) as unknown as UserAttributes;

    if(updatedUser){
        const User = await UserInstance.findOne({ where: { id: id } }) as unknown as UserAttributes;
    }
    return res.status(400).json({
        Error: "Error occured"
    })
        } catch(err){
            return res.status(500).json({
            Error: "Internal server Error",
            route: "/users/update-profile"
            })    
        }
    }

    //Forgot password