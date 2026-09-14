
INSERT INTO User (id, email, username, passwordHash, role, status, firstName, lastName, createdAt)
VALUES
('u1', 'admin@rental.com', 'admin', 'YWRtaW4xMjM=', 'ADMIN', 'ACTIVE', 'System', 'Administrator', datetime('now')),
('u2', 'employee@rental.com', 'employee', 'ZW1wbG95ZWUxMjM=', 'EMPLOYEE', 'ACTIVE', 'John', 'Employee', datetime('now'));

