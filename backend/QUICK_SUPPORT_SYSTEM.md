# Quick Support System - Simplified

## Tổng Quan

Hệ thống hỗ trợ nhanh đơn giản theo luồng hoạt động sau:

1. **User nhấn nút "Hỗ trợ nhanh"** hoặc **chọn agent cụ thể**
2. **Client gửi POST /api/support/requests** → Server trả HTTP 200 ngay lập tức
3. **Server xử lý matching bất đồng bộ** (không làm client chờ)
4. **Server thông báo kết quả qua WebSocket** real-time

## Database Schema

### SupportRequest Model

```sql
CREATE TABLE support_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(20) NOT NULL DEFAULT 'quick_support', -- 'quick_support' or 'choose_agent'
    status ENUM('WAITING', 'MATCHED', 'COMPLETED', 'TIMEOUT') NOT NULL DEFAULT 'WAITING',
    user_id BIGINT NOT NULL,
    agent_id BIGINT NULL,
    preferred_agent_id BIGINT NULL, -- For choose_agent type
    created_at TIMESTAMP NOT NULL,
    matched_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    timeout_at TIMESTAMP NULL
);
```

### Status Flow

```
WAITING → MATCHED → COMPLETED
       ↓
    TIMEOUT
```

## API Endpoints

### 1. Tạo Support Request

```
POST /api/support/requests
Authorization: Bearer <jwt_token>

Body (Quick Support):
{
  "type": "quick_support"
}

Body (Choose Agent):
{
  "type": "choose_agent",
  "agentId": 123
}

Response (HTTP 200 - Immediate):
{
  "requestId": 456,
  "status": "WAITING",
  "message": "Đã tiếp nhận yêu cầu, đang tìm kiếm agent...",
  "timestamp": 1703000000000
}
```

### 2. Lấy Agents Online

```
GET /api/support/agents/online
Authorization: Bearer <jwt_token>

Response:
{
  "agents": [
    {
      "id": 123,
      "fullName": "Agent Name",
      "email": "agent@example.com"
    }
  ],
  "count": 1,
  "timestamp": 1703000000000
}
```

### 3. Complete Request

```
POST /api/support/requests/{requestId}/complete
Authorization: Bearer <jwt_token>

Response:
{
  "message": "Request completed successfully",
  "requestId": 456,
  "timestamp": 1703000000000
}
```

### 4. Get My Requests

```
GET /api/support/requests/my
Authorization: Bearer <jwt_token>

Response:
{
  "requests": [...],
  "count": 5,
  "timestamp": 1703000000000
}
```

## WebSocket Real-time Updates

### Topics

- `/user/{userId}/topic/support-updates` - User-specific support updates

### Message Types

#### 1. Request Matched

```json
{
  "type": "request_matched",
  "message": "Đã tìm thấy agent! Agent John Doe sẽ hỗ trợ bạn.",
  "timestamp": 1703000000000,
  "request": {
    "id": 456,
    "status": "MATCHED",
    "type": "quick_support",
    "createdAt": "2023-12-20T10:00:00",
    "agent": {
      "id": 123,
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### 2. Request Timeout

```json
{
  "type": "request_timeout",
  "message": "Hiện tại không có agent nào khả dụng",
  "timestamp": 1703000000000,
  "request": {
    "id": 456,
    "status": "TIMEOUT",
    "type": "quick_support"
  }
}
```

#### 3. Request Completed

```json
{
  "type": "request_completed",
  "message": "Yêu cầu hỗ trợ đã hoàn thành",
  "timestamp": 1703000000000,
  "request": {
    "id": 456,
    "status": "COMPLETED"
  }
}
```

## Service Architecture

### 1. SupportController

- **POST /api/support/requests**: Nhận request, tạo record, trả HTTP response ngay
- **GET /api/support/agents/online**: Lấy danh sách agents online
- **POST /api/support/requests/{id}/complete**: Hoàn thành request

### 2. SupportRequestService (All-in-One)

- **createSupportRequest()**: Tạo request và trả về ngay lập tức
- **processMatching()**: Xử lý matching bất đồng bộ với @Async
- **processQuickSupportMatching()**: Auto-tìm agent tốt nhất
- **processChooseAgentMatching()**: Validate agent được chọn
- **findBestAvailableAgent()**: Algorithm chọn agent (ít workload nhất)
- **getOnlineAgents()**: Lấy danh sách agents online
- **completeRequest()**: Hoàn thành request
- **getUserRequests()**: Lấy requests của user

### 3. NotificationService

- **notifyRequestMatched()**: Thông báo khi match thành công
- **notifyRequestTimeout()**: Thông báo khi timeout
- **notifyRequestCompleted()**: Thông báo khi hoàn thành

### 4. WebSocketBroadcastService

- **broadcastToUser()**: Gửi message đến user cụ thể
- **broadcastAgentStatusChange()**: Broadcast agent status changes

## Luồng Hoạt Động Chi Tiết

### 1. Quick Support Flow

```
1. User clicks "Hỗ trợ nhanh"
   ↓
2. POST /api/support/requests { "type": "quick_support" }
   ↓
3. SupportRequestService.createSupportRequest()
   - Tạo record với status = WAITING
   - Trả response HTTP 200 ngay lập tức
   ↓
4. SupportRequestService.processMatching() @Async
   - findBestAvailableAgent()
   - Criteria: Online + workload < 3
   - Chọn agent ít workload nhất
   ↓
5a. Match thành công:
    - Update status = MATCHED, agent_id, matched_at
    - WebSocket notify cả user & agent
   ↓
5b. Không có agent:
    - Update status = TIMEOUT, timeout_at
    - WebSocket notify user
```

### 2. Choose Agent Flow

```
1. User chọn agent từ danh sách online
   ↓
2. POST /api/support/requests { "type": "choose_agent", "agentId": 123 }
   ↓
3. Tạo record với preferred_agent_id = 123
   ↓
4. SupportRequestService.processChooseAgentMatching()
   - Validate agent tồn tại
   - Validate agent online
   - Validate agent không quá tải
   ↓
5a. Validation pass: Match thành công
5b. Validation fail: Timeout với lý do cụ thể
```

## Business Rules

### 1. User Constraints

- User chỉ có thể có 1 active request (WAITING hoặc MATCHED)
- Request timeout sau 5 phút nếu không match được

### 2. Agent Constraints

- Agent tối đa 3 requests đồng thời
- Chỉ agents có status = ONLINE mới được xem xét

### 3. Matching Algorithm

- **Quick Support**: Chọn agent có ít workload nhất
- **Choose Agent**: Validate agent được chọn có available không

## Performance & Scalability

### 1. Async Processing

- Matching xử lý bất đồng bộ với @Async
- Client không phải chờ matching process
- HTTP response trả ngay trong < 100ms

### 2. Real-time Updates

- WebSocket chỉ notify những user liên quan
- Targeted messaging thay vì broadcast toàn hệ thống
- Message payload tối thiểu

### 3. Database Optimization

- Index trên user_id, agent_id, status, created_at
- Simple queries, no complex joins
- Timeout cleanup chạy định kỳ

## Frontend Integration

### 1. WebSocket Connection

```javascript
// Connect when user logs in
const socket = new SockJS("/ws?token=" + userToken);
const stompClient = Stomp.over(socket);

stompClient.subscribe("/user/topic/support-updates", (message) => {
  const data = JSON.parse(message.body);
  handleSupportUpdate(data);
});
```

### 2. Quick Support

```javascript
// Quick support
async function requestQuickSupport() {
  // Show "Đang chờ..." UI
  showWaitingUI();

  const response = await fetch("/api/support/requests", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "quick_support" }),
  });

  const result = await response.json();
  // Result comes immediately, WebSocket will update later
}

function handleSupportUpdate(data) {
  switch (data.type) {
    case "request_matched":
      showMatchedUI(data.request.agent);
      break;
    case "request_timeout":
      showTimeoutUI(data.message);
      break;
    case "request_completed":
      showCompletedUI();
      break;
  }
}
```

### 3. Choose Agent

```javascript
// Get online agents
const agents = await fetch("/api/support/agents/online");

// User selects agent
async function requestWithAgent(agentId) {
  showWaitingUI();

  const response = await fetch("/api/support/requests", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "choose_agent",
      agentId: agentId,
    }),
  });

  // WebSocket will notify result
}
```

## Monitoring & Metrics

### 1. Key Metrics

- Average matching time
- Match success rate
- Timeout rate by time of day
- Agent utilization

### 2. Logging

- All matching attempts với timing
- Timeout events với reason
- Agent selection decisions

### 3. Health Checks

- WebSocket connectivity
- Async processing queue health
- Database connection pool

## Testing

### 1. Unit Tests

- MatchingService algorithm
- SupportRequestService business rules
- WebSocket message formatting

### 2. Integration Tests

- Full request flow end-to-end
- WebSocket real-time notifications
- Concurrent user scenarios

### 3. Load Tests

- Multiple concurrent support requests
- Agent availability changes
- WebSocket connection scaling
