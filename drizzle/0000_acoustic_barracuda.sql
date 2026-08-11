CREATE TABLE `pageviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`referrer` text,
	`country` text,
	`language` text,
	`user_agent` text,
	`created_at` integer NOT NULL
);
