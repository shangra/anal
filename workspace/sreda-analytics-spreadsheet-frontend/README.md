
# Переменные окружения
```bash
PUBLIC_URL=/
BROWSER=none
PORT=3030
MF_TYPES_PORT=30300
```

# Запуск в docker
```bash
docker build -f Dockerfile.development --secret id=npmrc,src=<PATH_TO_NPMRC>/.npmrc --build-arg PORT=3030 --no-cache -t sreda1116-frontend:latest .
docker run -d --env-file .env -v "$(pwd)/:/app" -v /app/node_modules -p 3030:3030 -p 30300:30300 --add-host host.docker.internal:host-gateway --name sreda1116-frontend sreda1116-frontend:latest
```

# SVG

https://www.svgrepo.com/svg/321084/magic-portal

"proxy": "http://localhost:3001",

# Динамические компоненты

```jsx
<Container>
    <Test json={box} location={this.props.location} />
    <h2>DynPage</h2>

    <Components.ButtonCMP children={'CMP'} />
    <Components.BoxCMP content={'super div'} />
    <Components.TableCMP content={'super table'} />

    <Row className="mx-0">
        <MyButton as={Col} variant="primary">
            MyButton #1
        </MyButton>
        <MyButton as={Col} variant="secondary" className="mx-2">
            MyButton #2
        </MyButton>
        <MyButton as={Col} variant="success">
            MyButton #3
        </MyButton>
    </Row>
</Container>
```
