### Lệnh chạy server Openvidu
docker run -p 4443:4443 --rm -e OPENVIDU_RECORDING=true -e OPENVIDU_RECORDING_PATH=/d/VTI -v /var/run/docker.sock:/var/run/docker.sock -v /d/VTI:/d/VTI openvidu/openvidu-dev:2.31.0
