
import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import cors from 'cors';

// server index
const main = async () => {
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up();

    const app = express();
    app.set("trust proxy", 1);

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient();

    app.use(
        cors({
            origin: 'http://localhost:3000',
            credentials: true,
        })
    );
    app.use(
    session({
        name: 'qid',
        store: new RedisStore({ client: redisClient, disableTouch: true }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
            sameSite: 'none', // csrf
            httpOnly: true,
            secure: __prod__ // cookie only works in https
        },
        saveUninitialized: false,
        secret: 'asdklfnasldikvnalsk',
        resave: false,
    })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        context: ({ req, res }) => ({ em: orm.em, req, res })
    });

    apolloServer.applyMiddleware({ app, cors: false, });

    app.get('/', (_, res) => {
        res.send('hello');
    })

    app.listen(4000, () => {
        console.log('Server listening on localhost:4000');
    })

    // const post = orm.em.create(Post, {title: 'my first entry'});
    // await orm.em.persistAndFlush(post);

    // const posts = await orm.em.find(Post, {});
    // console.log(posts);
    
};

main().catch((err) => {
    console.log(err);
});


