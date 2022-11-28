import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';

dotenv.config()

export const db = new Sequelize('app', '', '', {
    storage: "./food.sqlite",
    dialect: "sqlite",
    logging: false
})
/* the empty strings are for username & password, though sqlite doesn't need it, but if you're working 
with postgres or mysql, you must add it */

export const accountSid = process.env.AccountSID;
export const authToken = process.env.AuthToken;
export const fromAdminPhone = process.env.fromAdminPhone;
export const GMAIL_USER = process.env.GMAIL_USER;
export const GMAIL_PASS = process.env.GMAIL_PASS;
export const FromAdminMail = process.env.FromAdminMail as string;
export const userSubject = process.env.usersubject as string;
export const APP_SECRET = process.env.APP_SECRET as string;    /*you can either use 'as string' or you use '!'*/