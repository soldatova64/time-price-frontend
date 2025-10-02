FROM nginx:1.29-alpine

# Копируем все файлы из папки public в nginx html директорию
COPY public/ /usr/share/nginx/html/

# Копируем конфигурацию nginx (предполагается, что nginx.conf в корне проекта)
COPY nginx.conf /etc/nginx/nginx.conf

# Создаем папку для логов
RUN mkdir -p /var/log/nginx

# Открываем порт 80
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]