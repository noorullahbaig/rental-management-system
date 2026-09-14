
INSERT INTO User (id, email, username, passwordHash, role, status, firstName, lastName, createdAt)
VALUES
('u3', 'm.chang@techcorp.com', 'tenant', 'dGVuYW50MTIz', 'TENANT', 'ACTIVE', 'Michael', 'Chang', '2026-09-14T12:00:00.000Z');

INSERT INTO TenantProfile (id, userId, tenantId, phoneNumber, notificationsEnabled)
VALUES
('tp1', 'u3', 'tenant-michael', '+60 12-345 6789', 1);

