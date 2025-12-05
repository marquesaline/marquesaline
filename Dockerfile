FROM ruby:3.2

WORKDIR /site

RUN gem install jekyll bundler

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000 35729

ENTRYPOINT ["/entrypoint.sh"]
