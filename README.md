CHAT APPLICATION

The application can be started in two ways.

  1. Using Docker. Open the root folder in Terminal or Command Prompt and type "docker compose up" or "docker compose up --build". Afterwards, three containers will be created: redis-container, server-container, and client-container.
     So, each part of the app has its own container. Then, the application can be opened in the browser with "http://localhost:4200/". Also, the server listens on port 3000, which can be tested in Postman (POST request on http://localhost:3000/register).
  2. Using the URL of the deployed application, which is the following: https://chatapp-29de5.web.app/. The application is deployed on two platforms: client part (Angular) is deployed using Firebase Hosting platform, whereas server part
     (NodejS) is deployed as a Heroku application. Also, the database used here is the Redis Cloud database. This is the link for the deployed Heroku app, containing server part only: https://chatapp-server-d43f12041ed2.herokuapp.com/.
     The code to check Heroku and Firebase URLs in app can be found inside branch "feature/deploy". The server can be tested in Postman (POST request on https://chatapp-server-d43f12041ed2.herokuapp.com/login or register).


The application has three parts: client which is created in Angular, server created in NodeJS, and a Redis database. The client is connected with the server using their respective URLs. The connection is made in both server and client. However, the
URLs differ in two branches. That is because branch "feature/deploy" was used only for deployment purposes. For instance, inside root/client/chat-app/src/environments, there are two environment files, where server URL is placed, which is then used for
connecting the server with the client. The "SOCKET_ENPOINT" differs in main and feature/deploy branches. Also, the CORS connection in index.js file - which is located in root/server - has two different client URLs in these two branches.

I made a decision to use Angular as the frontend part of the app, because I have the most knowledge in this framework. Also, there are two Redis databases used in this project. The first one is the official Docker Redis image which is mentioned inside
docker-compose.yml file. The "feature/deploy" branch uses Redis Cloud database, which was created by me. I did this because it is easier to work with a Redis Cloud database on a deployed application.

The application is present on a GitHub repository, which can be accessed using the following link: https://github.com/AmelHelez/chat-application.
