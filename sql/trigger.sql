/* =====================================================
   Trigger: locationName 변경 시 좌표 초기화
   대상 테이블: planet_media
   ===================================================== */

DELIMITER $$

CREATE TRIGGER trg_reset_coordinates_on_location_change
BEFORE UPDATE ON planet_media
FOR EACH ROW
BEGIN
    IF OLD.locationName IS NOT NULL
       AND NEW.locationName IS NOT NULL
       AND OLD.locationName <> NEW.locationName THEN

        SET NEW.latitude  = NULL;
        SET NEW.longitude = NULL;

    END IF;
END$$

DELIMITER ;
