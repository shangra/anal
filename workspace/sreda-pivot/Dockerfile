FROM docker-dev.registry-ci.delta.sbrf.ru/ci04675739/ci04675739/nodejs-22:9.7.2-se

ARG TOKEN=''

COPY . /tmp

WORKDIR /tmp

# Добавляем репозиторий sosc
RUN dnf install -y redhat-rpm-config \
    postgresql-devel \
    make \
    libpq \
    gcc \
    gcc-c++ -y \
    libffi-devel \
    zlib-devel \
    krb5-workstation \
    python3.12 \
    python3.12-devel.x86_64 \
    libjpeg-turbo-devel \
    xz

RUN curl -L -O  "https://token:$TOKEN@sberosc.sigma.sbrf.ru/repo/rpm/india_redhat_8/epel-el8-x86_64-rpms/Packages/k/kstart-4.2-10.el8.x86_64.rpm" \
    && rpm -ivh kstart-4.2-10.el8.x86_64.rpm \
    && rm -rf kstart-4.2-10.el8.x86_64.rpm \
    && rm -rf /usr/lib/python3.9/site-packages/idna-2.10-py3.9.egg-info \
    && ln -sf /usr/bin/python3.12 /usr/bin/python

RUN cp /tmp/docker/ca-certificates/* /etc/pki/ca-trust/source/anchors/ && update-ca-trust

# RUN curl --insecure -f -O https://token:$TOKEN@sberosc.sigma.sbrf.ru/repo/extras/nodejs/v22.14.0/node-v22.14.0.tar.xz \
#     && xzcat node-v22.14.0.tar.xz | gzip > node-v22.14.0.tar.gz

RUN echo -e "disturl=https://token:$TOKEN@sberosc.sigma.sbrf.ru/repo/extras/nodejs/\nlockfile-include-tarball-url=true\nauto-install-peers=true\nstrict-peer-dependencies=false" >> ~/.npmrc \
    && export TOKEN64=$(echo -n "token:$TOKEN" | base64) \
    && echo "TOKEN64=$TOKEN64" >> /etc/environment \
    && npm config set strict-ssl false \
    && npm config set audit false \
    && npm config set registry https://sberosc.sigma.sbrf.ru/repo/npm \
    && npm config set //sberosc.sigma.sbrf.ru/repo/npm/:_authToken=$TOKEN64

RUN npm ci && npm i pg-native && npm cache clean --force

RUN npm run build:bundle && npm run build:obfuscate
# \ && npm run build:binary -- -n file:///app/node-v22.14.0.tar.gz

RUN mkdir -p /app && \
    mv /tmp/dist-temp/bundle-obf.js /tmp/node_modules /app/ && \
    rm -rf /tmp/*

WORKDIR /app

# Раскомментируйте при необходимости использования Kerberos
# ENV KRB5CCNAME=/tmp/krb5cc_$(id -u)
# ENV KRB5_KTNAME=/etc/krb5.keytab
