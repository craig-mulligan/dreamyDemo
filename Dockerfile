# Use base image for device arch with node installed
FROM resin/raspberrypi2-node

# Enable systemd
ENV INITSYSTEM on

# create src dir
RUN mkdir -p /usr/src/app/

# set as WORKDIR
WORKDIR /usr/src/app

# Only package.json and pre-install script here for caching purposes
COPY package.json ./

#install deps
RUN JOBS=MAX npm install --unsafe-perm --production -s && npm cache clean 

# Copy all of files here for caching purposes
COPY . ./

# npm start will run server.js by default
CMD ["npm", "start"]