FROM ruby:3.2

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

WORKDIR /site

RUN gem install jekyll bundler

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000 35729

ENTRYPOINT ["/entrypoint.sh"]