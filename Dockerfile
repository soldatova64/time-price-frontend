FROM nginx:1.29-alpine

# Копируем статические файлы из папки public в nginx
COPY public/* /usr/share/nginx/html/

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Открываем порт 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]