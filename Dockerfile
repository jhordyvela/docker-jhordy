FROM node:20-alpine

WORKDIR /usr/src/app

# Copiar dependencias
COPY package*.json ./
RUN npm install --production
# Instalar sonar-scanner globalmente
RUN npm install -g sonar-scanner

# Copiar todo el backend
COPY . .

# Variables de entorno
ENV PORT=3000
ENV DB_HOST=db
ENV DB_PORT=5432
ENV DB_NAME=minimarket
ENV DB_USER=postgres
ENV DB_PASSWORD=Jmvela2005
ENV DB_SSL=false
ENV GC_BUCKET=test-bucket

EXPOSE 3000

# Ejecutar index.js dentro de src
CMD ["node", "src/index.js"]