---
description: Workflow để tạo commit message theo phong cách chuẩn của project
---

# Commit Message Workflow

Workflow này hướng dẫn cách tạo commit message theo phong cách đã thiết lập trong project.

## Format Chuẩn

```
<type>(<scope>): <subject>

- <change 1>
- <change 2>
- <change 3>
...
```

## Các Thành Phần

### 1. Type (Bắt buộc)

- `feat`: Tính năng mới
- `fix`: Sửa lỗi
- `refactor`: Tái cấu trúc code (không thêm tính năng, không sửa lỗi)
- `perf`: Cải thiện performance
- `docs`: Cập nhật documentation
- `style`: Format code (không ảnh hưởng logic)
- `test`: Thêm/sửa tests
- `chore`: Các thay đổi khác (build, dependencies, etc.)

### 2. Scope (Bắt buộc)

Phạm vi thay đổi, ví dụ:

- `schema`: Thay đổi database schema
- `ticket`: Module ticket
- `donate`: Module donation
- `core`: Core utilities/infrastructure
- `config`: Configuration files
- Hoặc tên module/feature cụ thể

### 3. Subject (Bắt buộc)

- Mô tả ngắn gọn (< 72 ký tự)
- Viết thường, không dấu chấm cuối
- Dùng tiếng Việt có dấu
- Ví dụ: "chuẩn hóa quan hệ Member và logic tạo data"

### 4. Body (Bắt buộc)

Danh sách bullet points mô tả chi tiết:

- Mỗi bullet bắt đầu bằng `-`
- Mô tả cụ thể từng thay đổi
- Có thể đề cập file/function/class với backticks
- Ưu tiên ngắn gọn, súc tích

## Ví Dụ Thực Tế

### Ví dụ 1: Feature

```
feat(donate/ticket): thêm hệ thống donation ẩn danh và chuẩn hóa cấu hình

- Thêm `donorCode` vào schema Donation để theo dõi ẩn danh (DNRxxxx)
- Cập nhật DonateRepository tạo mã giao dịch (DNTxxxx) và mã người dùng ngẫu nhiên
- Cập nhật lệnh donate hiển thị mã ẩn danh và hỗ trợ nội dung lời nhắn
- Tái cấu trúc timeout và cache về `config/time.ts`, xóa bỏ hằng số rác
- Đổi prefix mã Ticket sang ký hiệu ngắn gọn (RP, FB, BU)
```

### Ví dụ 2: Refactor

```
refactor(schema): chuẩn hóa quan hệ Member và logic tạo data

- Cập nhật schema: Member lk Donation/Ticket, chuyển donorCode về Member
- Tạo MemberRepository quản lý user và donor code
- Tích hợp tự động tạo Member trong TicketRepository/DonateRepository
- Cập nhật handlers/commands sử dụng relation mới (requester, closer, donor, confirmer)
- Fix lỗi type Prisma TicketUpdateInput và tối ưu FK constraints
```

### Ví dụ 3: Fix

```
fix(ticket): sửa lỗi hiển thị số thứ tự trong danh sách

- Tính toán số thứ tự dựa trên page và limit thay vì index của array hiện tại
- Đảm bảo số thứ tự tăng dần chính xác qua các trang (1-5, 6-10,...)
```

## Quy Trình Thực Hiện

// turbo-all

1. **Chạy pnpm lint:**

```bash
pnpm lint
```

2. **Xem các file đã thay đổi:**

```bash
git status
```

3. **Stage tất cả thay đổi:**

```bash
git add .
```

4. **Tạo commit message theo format:**
   - Xác định type phù hợp (feat/fix/refactor/...)
   - Xác định scope (module/feature bị ảnh hưởng)
   - Viết subject ngắn gọn
   - List ra các thay đổi chính dưới dạng bullet points

5. **Commit:**

```bash
git commit -m "<type>(<scope>): <subject>

- <change 1>
- <change 2>
- ..."
```

## Lưu Ý

- **Ngôn ngữ**: Dùng tiếng Việt có dấu cho subject và body
- **Độ dài subject**: Tối đa 72 ký tự
- **Body**: Mỗi bullet point nên ngắn gọn, tập trung vào "cái gì" thay vì "tại sao"
- **Nhóm thay đổi**: Nếu có nhiều thay đổi liên quan, gộp vào 1 commit
- **Tách commit**: Nếu có thay đổi không liên quan, tách thành nhiều commit
