FROM ubuntu:20.04

# Avoid interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    apache2 \
    libapache2-mod-shib2 \
    libapache2-mod-php \
    curl \
    openssl \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Enable required Apache modules
RUN a2enmod ssl \
    && a2enmod headers \
    && a2enmod proxy \
    && a2enmod proxy_http \
    && a2enmod shib

# Apache configuration
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Create directory for Shibboleth logs
RUN mkdir -p /var/log/shibboleth \
    && chown -R _shibd:_shibd /var/log/shibboleth

# Copy the default Apache site configuration
COPY apache-shibd.conf /etc/apache2/sites-available/000-default.conf
RUN a2ensite 000-default

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Start Apache and Shibd services
CMD service shibd start && apache2ctl -D FOREGROUND
