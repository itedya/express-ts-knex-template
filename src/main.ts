import 'reflect-metadata';
import 'dotenv/config';
import createApp from "./app";

createApp().then(app => app.listen(3000));