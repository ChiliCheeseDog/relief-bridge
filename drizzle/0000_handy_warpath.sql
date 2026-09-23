CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic` text NOT NULL,
	`location` text NOT NULL,
	`region` text NOT NULL,
	`item` text NOT NULL,
	`quantity` integer NOT NULL,
	`priority` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`supply_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'Allocated' NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supply_id`) REFERENCES `supplies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shipments_request` ON `shipments` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_shipments_supply` ON `shipments` (`supply_id`);--> statement-breakpoint
CREATE TABLE `supplies` (
	`id` text PRIMARY KEY NOT NULL,
	`donor` text NOT NULL,
	`location` text NOT NULL,
	`region` text NOT NULL,
	`item` text NOT NULL,
	`quantity` integer NOT NULL,
	`created` text NOT NULL
);
