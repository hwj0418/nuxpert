docker build -t nuxpert .
# docker run -v ~/.config/gcloud:/root/.config/gcloud -p 8080:8080 -d --name node-app node-app
docker run -p 3000:3000 -d --name nuxpert nuxpert
sleep 10s
docker logs nuxpert
# sleep 3s
# docker tag node-app gcr.io/kubernetes-221921/node-app:latest
# docker push gcr.io/kubernetes-221921/node-app