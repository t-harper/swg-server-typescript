-- SWG-Source-JS Database Schema
-- Auto-generated from Drizzle ORM schema definitions

-- ============================================================================
-- Accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS `accounts` (
  `account_id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `station_id` BIGINT UNIQUE,
  `status` ENUM('active', 'suspended', 'banned', 'pending') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` DATETIME,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `accounts_username_unique` (`username`),
  INDEX `idx_accounts_username` (`username`),
  INDEX `idx_accounts_station_id` (`station_id`),
  INDEX `idx_accounts_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Characters
-- ============================================================================

CREATE TABLE IF NOT EXISTS `characters` (
  `character_id` BIGINT NOT NULL,
  `account_id` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `scene_id` VARCHAR(50) NOT NULL,
  `x` FLOAT NOT NULL DEFAULT 0,
  `y` FLOAT NOT NULL DEFAULT 0,
  `z` FLOAT NOT NULL DEFAULT 0,
  `orientation_x` FLOAT NOT NULL DEFAULT 0,
  `orientation_y` FLOAT NOT NULL DEFAULT 0,
  `orientation_z` FLOAT NOT NULL DEFAULT 0,
  `orientation_w` FLOAT NOT NULL DEFAULT 1,
  `template_name` VARCHAR(255) NOT NULL DEFAULT 'object/creature/player/shared_human_male.iff',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_saved` DATETIME,
  PRIMARY KEY (`character_id`),
  INDEX `idx_characters_account_id` (`account_id`),
  INDEX `idx_characters_name` (`name`),
  INDEX `idx_characters_scene_id` (`scene_id`),
  CONSTRAINT `fk_characters_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `character_appearance` (
  `character_id` BIGINT NOT NULL,
  `customization_data` BLOB,
  `scale` FLOAT NOT NULL DEFAULT 1.0,
  PRIMARY KEY (`character_id`),
  CONSTRAINT `fk_character_appearance_character_id` FOREIGN KEY (`character_id`) REFERENCES `characters` (`character_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `character_skills` (
  `character_id` BIGINT NOT NULL,
  `skill_name` VARCHAR(100) NOT NULL,
  `acquired_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`character_id`, `skill_name`),
  INDEX `idx_character_skills_character_id` (`character_id`),
  INDEX `idx_character_skills_skill_name` (`skill_name`),
  CONSTRAINT `fk_character_skills_character_id` FOREIGN KEY (`character_id`) REFERENCES `characters` (`character_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `character_experience` (
  `character_id` BIGINT NOT NULL,
  `experience_type` VARCHAR(50) NOT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`character_id`, `experience_type`),
  INDEX `idx_character_experience_character_id` (`character_id`),
  INDEX `idx_character_experience_type` (`experience_type`),
  CONSTRAINT `fk_character_experience_character_id` FOREIGN KEY (`character_id`) REFERENCES `characters` (`character_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Objects
-- ============================================================================

CREATE TABLE IF NOT EXISTS `objects` (
  `object_id` BIGINT NOT NULL,
  `template_crc` INT NOT NULL,
  `type_id` INT NOT NULL,
  `container_id` BIGINT,
  `slot_arrangement` INT NOT NULL DEFAULT -1,
  `scene_id` VARCHAR(50),
  `x` FLOAT NOT NULL DEFAULT 0,
  `y` FLOAT NOT NULL DEFAULT 0,
  `z` FLOAT NOT NULL DEFAULT 0,
  `orientation_w` FLOAT NOT NULL DEFAULT 1,
  `orientation_x` FLOAT NOT NULL DEFAULT 0,
  `orientation_y` FLOAT NOT NULL DEFAULT 0,
  `orientation_z` FLOAT NOT NULL DEFAULT 0,
  `load_contents` BOOLEAN NOT NULL DEFAULT TRUE,
  `object_name_stf_file` VARCHAR(100),
  `object_name_stf_name` VARCHAR(100),
  `scale` FLOAT NOT NULL DEFAULT 1.0,
  `volume` INT NOT NULL DEFAULT 1,
  `object_complexity` FLOAT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`object_id`),
  INDEX `idx_objects_template_crc` (`template_crc`),
  INDEX `idx_objects_type_id` (`type_id`),
  INDEX `idx_objects_container_id` (`container_id`),
  INDEX `idx_objects_scene_id` (`scene_id`),
  INDEX `idx_objects_scene_position` (`scene_id`, `x`, `z`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `object_tangibles` (
  `object_id` BIGINT NOT NULL,
  `custom_name` VARCHAR(255),
  `condition` INT NOT NULL DEFAULT 100,
  `max_condition` INT NOT NULL DEFAULT 100,
  `pvp_status` INT NOT NULL DEFAULT 0,
  `pvp_faction` INT NOT NULL DEFAULT 0,
  `options_bitmask` INT NOT NULL DEFAULT 0,
  `count` INT NOT NULL DEFAULT 1,
  `max_hit_points` INT NOT NULL DEFAULT 0,
  `owner_id` BIGINT,
  `crafted_by_id` BIGINT,
  `serial_number` BIGINT,
  `use_count` INT NOT NULL DEFAULT 0,
  `max_use_count` INT NOT NULL DEFAULT -1,
  `appearance_data` BLOB,
  `armor_rating` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`object_id`),
  CONSTRAINT `fk_object_tangibles_object_id` FOREIGN KEY (`object_id`) REFERENCES `objects` (`object_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `object_creatures` (
  `object_id` BIGINT NOT NULL,
  `species_id` INT NOT NULL DEFAULT 0,
  `posture` TINYINT NOT NULL DEFAULT 0,
  `locomotion` TINYINT NOT NULL DEFAULT 0,
  `current_health` INT NOT NULL DEFAULT 0,
  `max_health` INT NOT NULL DEFAULT 0,
  `health_wounds` INT NOT NULL DEFAULT 0,
  `current_action` INT NOT NULL DEFAULT 0,
  `max_action` INT NOT NULL DEFAULT 0,
  `action_wounds` INT NOT NULL DEFAULT 0,
  `current_mind` INT NOT NULL DEFAULT 0,
  `max_mind` INT NOT NULL DEFAULT 0,
  `mind_wounds` INT NOT NULL DEFAULT 0,
  `level` INT NOT NULL DEFAULT 1,
  `faction` VARCHAR(50),
  `mood_id` INT NOT NULL DEFAULT 0,
  `state_flags` BIGINT NOT NULL DEFAULT 0,
  `target_id` BIGINT,
  PRIMARY KEY (`object_id`),
  INDEX `idx_object_creatures_species` (`species_id`),
  INDEX `idx_object_creatures_level` (`level`),
  INDEX `idx_object_creatures_faction` (`faction`),
  CONSTRAINT `fk_object_creatures_object_id` FOREIGN KEY (`object_id`) REFERENCES `objects` (`object_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `object_dirty_tracking` (
  `object_id` BIGINT NOT NULL,
  `base_object_dirty` BOOLEAN NOT NULL DEFAULT FALSE,
  `tangible_dirty` BOOLEAN NOT NULL DEFAULT FALSE,
  `creature_dirty` BOOLEAN NOT NULL DEFAULT FALSE,
  `last_saved_at` DATETIME,
  `dirty_properties` VARCHAR(1000),
  PRIMARY KEY (`object_id`),
  INDEX `idx_dirty_tracking_base` (`base_object_dirty`),
  INDEX `idx_dirty_tracking_tangible` (`tangible_dirty`),
  INDEX `idx_dirty_tracking_creature` (`creature_dirty`),
  CONSTRAINT `fk_dirty_tracking_object_id` FOREIGN KEY (`object_id`) REFERENCES `objects` (`object_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Market / Bazaar
-- ============================================================================

CREATE TABLE IF NOT EXISTS `market_auctions` (
  `auction_id` BIGINT NOT NULL,
  `seller_id` BIGINT NOT NULL,
  `seller_name` VARCHAR(64) NOT NULL,
  `item_id` BIGINT NOT NULL,
  `item_name` VARCHAR(128) NOT NULL,
  `item_template_crc` INT NOT NULL,
  `item_category` INT NOT NULL,
  `item_attributes` JSON,
  `price` INT NOT NULL,
  `is_auction` BOOLEAN DEFAULT FALSE,
  `instant_sale_price` INT,
  `vendor_id` BIGINT,
  `planet_id` VARCHAR(32) NOT NULL,
  `region_id` VARCHAR(64),
  `listed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `status` VARCHAR(16) DEFAULT 'active',
  PRIMARY KEY (`auction_id`),
  INDEX `idx_market_auctions_seller_id` (`seller_id`),
  INDEX `idx_market_auctions_category` (`item_category`),
  INDEX `idx_market_auctions_planet_id` (`planet_id`),
  INDEX `idx_market_auctions_planet_region` (`planet_id`, `region_id`),
  INDEX `idx_market_auctions_expires_at` (`expires_at`),
  INDEX `idx_market_auctions_status_expires` (`status`, `expires_at`),
  INDEX `idx_market_auctions_price` (`price`),
  INDEX `idx_market_auctions_category_planet_price` (`item_category`, `planet_id`, `price`),
  INDEX `idx_market_auctions_vendor_id` (`vendor_id`),
  INDEX `idx_market_auctions_template_crc` (`item_template_crc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `market_bids` (
  `bid_id` BIGINT NOT NULL,
  `auction_id` BIGINT NOT NULL,
  `bidder_id` BIGINT NOT NULL,
  `bidder_name` VARCHAR(64) NOT NULL,
  `amount` INT NOT NULL,
  `bid_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_winning` BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (`bid_id`),
  INDEX `idx_market_bids_auction_id` (`auction_id`),
  INDEX `idx_market_bids_bidder_id` (`bidder_id`),
  INDEX `idx_market_bids_auction_winning` (`auction_id`, `is_winning`),
  INDEX `idx_market_bids_auction_amount` (`auction_id`, `amount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `market_sale_history` (
  `sale_id` BIGINT NOT NULL,
  `seller_id` BIGINT NOT NULL,
  `buyer_id` BIGINT NOT NULL,
  `item_template_crc` INT NOT NULL,
  `item_category` INT NOT NULL,
  `sale_price` INT NOT NULL,
  `planet_id` VARCHAR(32),
  `sold_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sale_id`),
  INDEX `idx_market_sale_history_seller_id` (`seller_id`),
  INDEX `idx_market_sale_history_buyer_id` (`buyer_id`),
  INDEX `idx_market_sale_history_template_crc` (`item_template_crc`),
  INDEX `idx_market_sale_history_category` (`item_category`),
  INDEX `idx_market_sale_history_sold_at` (`sold_at`),
  INDEX `idx_market_sale_history_template_sold` (`item_template_crc`, `sold_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vendor_inventory` (
  `vendor_id` BIGINT NOT NULL,
  `item_id` BIGINT NOT NULL,
  `price` INT NOT NULL,
  `description` VARCHAR(256),
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_id`, `item_id`),
  INDEX `idx_vendor_inventory_vendor_id` (`vendor_id`),
  INDEX `idx_vendor_inventory_item_id` (`item_id`),
  INDEX `idx_vendor_inventory_vendor_price` (`vendor_id`, `price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
