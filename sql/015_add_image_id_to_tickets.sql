ALTER TABLE bill_inbox_tickets
ADD COLUMN bill_inbox_image_id INT NULL COMMENT 'FK -> bill_inbox_images.id (รูปต้นฉบับ)';

ALTER TABLE bill_inbox_tickets
ADD CONSTRAINT fk_ticket_image
FOREIGN KEY (bill_inbox_image_id) REFERENCES bill_inbox_images(id) ON DELETE SET NULL;

CREATE INDEX idx_ticket_image ON bill_inbox_tickets(bill_inbox_image_id);
