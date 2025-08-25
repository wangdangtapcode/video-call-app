package com.example.backend.service;

import com.example.backend.dto.response.S3TreeResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.util.Optional;

@Service
public class S3TreeService {

    @Autowired
    private S3Client s3Client;

    private final String bucketName = "openvidurecord";

    public S3TreeResponse getSubTree(String folderKey) {
        // root nếu folderKey rỗng
        boolean isRoot = folderKey == null || folderKey.isEmpty();

        // đảm bảo folderKey kết thúc bằng "/" nếu không phải root
        String prefix = isRoot ? "" : (folderKey.endsWith("/") ? folderKey : folderKey + "/");

        ListObjectsV2Response res = s3Client.listObjectsV2(
                ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .prefix(prefix)
                        .delimiter("/") // chỉ folder con trực tiếp
                        .build()
        );

        S3TreeResponse folderNode = new S3TreeResponse();
        folderNode.setName(isRoot ? "root" : folderKey.contains("/") ? folderKey.substring(folderKey.lastIndexOf("/") + 1) : folderKey);
        folderNode.setKey(folderKey == null ? "" : folderKey);
        folderNode.setFolder(true);
//        folderNode.setType("folder"); // thêm type
        folderNode.setSize(0L); // folder không có size
        folderNode.setLastModified(null); // folder không có thời gian

        // Thêm folder con
        if (res.commonPrefixes() != null) {
            res.commonPrefixes().forEach(p -> {
                S3TreeResponse subFolder = new S3TreeResponse();
                String folderName = p.prefix().substring(prefix.length(), p.prefix().length() - 1); // tên folder trực tiếp
                subFolder.setName(folderName);
                subFolder.setKey(p.prefix());
                subFolder.setFolder(true);
//                subFolder.setType("folder");
                subFolder.setSize(0L);
                subFolder.setLastModified(null);
                folderNode.getChildren().add(subFolder);
            });
        }

        // Thêm file trong folder hiện tại (loại bỏ file trong subfolder)
        if (res.contents() != null) {
            res.contents().forEach(obj -> {
                String key = obj.key();
                if (!key.equals(prefix) && !key.substring(prefix.length()).contains("/")) {
                    S3TreeResponse fileNode = new S3TreeResponse();
                    fileNode.setName(key.substring(key.lastIndexOf("/") + 1));
                    fileNode.setKey(key);
                    fileNode.setFolder(false);
//                    fileNode.setType("file"); // thêm type
                    fileNode.setSize(obj.size());
                    fileNode.setLastModified(obj.lastModified());
                    folderNode.getChildren().add(fileNode);
                }
            });
        }

        return folderNode;
    }

}
