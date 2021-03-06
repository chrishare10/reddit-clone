import { MyContext } from '../types';
import { Resolver, Mutation, Arg, Ctx, Field, InputType, ObjectType, Query } from 'type-graphql';
import argon2 from 'argon2';
import { User } from '../entities/User';
import {EntityManager} from '@mikro-orm/postgresql'

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
}

@ObjectType() 
class FieldError {
    @Field()
    field: String;

    @Field()
    message: String;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[];

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver()
export class UserResolver {
    @Query(() => User, {nullable: true})
    async me(
        @Ctx() { req, em }:MyContext
    ) {
        // you are not logged in
        if (!req.session.userId) {
            return null
        }

        const user = await em.findOne(User, { id: req.session.userId });
        return user;
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        if (options.username.length <= 2) {
            return {
                errors: [{
                    field: 'username',
                    message: 'Username must be greater than 3 characters'
                }]
            }
        }

        if (options.password.length <= 7) {
            return {
                errors: [{
                    field: 'password',
                    message: 'Password must be greater than 7 characters'
                }]
            }
        }

        const hashedPassword = await argon2.hash(options.password)
        let user;
        try {
            const result = await (em as EntityManager)
            .createQueryBuilder(User)
            .getKnexQuery()
            .insert(
                {
                    username: options.username, 
                    password: hashedPassword,
                    created_at: new Date(),
                    updated_at: new Date(),

                })
                .returning('*');
            user = result[0];    
        } catch(err) {
            // duplicate username error
            if (err.code === "23505") {
            return {
                errors : [{
                    field: 'username',
                    message: 'Username already taken',
                }]
            }
            }
            console.log('message: ', err.message);
        }
        
        //store user id session
        //this will set a cookie on the user and keep them logged in
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        
        const user = await em.findOne(User, { username: options.username });
        if (!user) {
            return {
                errors: [
                    {
                        field: "username",
                        message: "That username does not exist",
                    },
                ], 
            };
        }
        
        const valid = await argon2.verify(user.password, options.password);
        if(!valid) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "Incorrect Password",
                    },
                ], 
            };
        }

        req.session.userId = user.id;


        return {
            user,
        };
    }
} 