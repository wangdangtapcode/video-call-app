import React, { useEffect } from "react";
import { PermissionRequestPage } from "../components/VideoCall/PermissionRequestPage";
import { useUser } from "../context/UserContext";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { usePermissionUpdates } from "../hooks/usePermissionUpdates";
export const PermissionRequest = () => {
  const { requestId } = useParams();
  const { updateStatus, user, token } = useUser();
  const { permissionNotifications } = usePermissionUpdates();
  const navigate = useNavigate();
  // Xử lý khi user hủy bỏ
  const onCancel = async () => {
    try {
      // Gửi cancel permission request tới server
      await axios.post(
        `http://localhost:8081/api/support/requests/${requestId}/cancel-permission`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Cập nhật status về ONLINE
      await updateStatus("ONLINE");

      if(user?.role === "AGENT") {
        navigate("/agent");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Error cancelling permission:", error);
      // Vẫn cập nhật status về ONLINE ngay cả khi có lỗi
      await updateStatus("ONLINE");
    }
  };

  // Xử lý khi user thoát tab/đóng browser
  // useEffect(() => {
  //   const handleBeforeUnload = async (event) => {
  //     try {
  //       // Sử dụng sendBeacon để đảm bảo request được gửi ngay cả khi thoát tab
  //       const data = JSON.stringify({});
  //       navigator.sendBeacon(
  //         `http://localhost:8081/api/support/requests/${requestId}/cancel-permission`,
  //         data
  //       );
  //     } catch (error) {
  //       console.error("Error sending cancel beacon:", error);
  //     }
  //   };

  //   // const handleVisibilityChange = async () => {
  //   //   if (document.hidden) {
  //   //     // Tab bị ẩn, có thể user đã chuyển tab hoặc minimize window
  //   //     // Có thể thêm logic để detect nếu user thực sự thoát
  //   //     try {
  //   //       await axios.post(
  //   //         `http://localhost:8081/api/support/requests/${requestId}/cancel-permission`,
  //   //         {},
  //   //         {
  //   //           headers: {
  //   //             Authorization: `Bearer ${token}`
  //   //           }
  //   //         }
  //   //       );
  //   //     } catch (error) {
  //   //       console.error("Error cancelling on visibility change:", error);
  //   //     }
  //   //   }
  //   // };

  //   window.addEventListener("beforeunload", handleBeforeUnload);
  //   // document.addEventListener("visibilitychange", handleVisibilityChange);

  //   return () => {
  //     window.removeEventListener("beforeunload", handleBeforeUnload);
  //     // document.removeEventListener("visibilitychange", handleVisibilityChange);
  //   };
  // }, [requestId, token]);

     return <PermissionRequestPage onCancel={onCancel} />;
};
