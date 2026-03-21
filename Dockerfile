FROM node:18-alpine
RUN npm install -g serve
COPY dist/ /app/dist/
WORKDIR /app
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
