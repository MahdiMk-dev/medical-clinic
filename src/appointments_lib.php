<?php
declare(strict_types=1);

/**
 * Helpers for appointment overlap validation.
 * Overlap rule: two intervals [start,end) overlap if start1 < end2 AND end1 > start2
 * We disallow any overlap for the same doctor OR same room OR same patient.
 */

function appt_dt_bounds(string $date, string $fromTime, string $toTime): array {
    // $date in 'YYYY-MM-DD', times in 'HH:MM:SS'
    // Return start_dt, end_dt as 'YYYY-MM-DD HH:MM:SS'
    $start = $date . ' ' . $fromTime;
    $end   = $date . ' ' . $toTime;
    return [$start, $end];
}

/**
 * Returns a conflicting row count for a given new interval & participants.
 * $excludeId is used when updating/moving an existing appointment.
 */
function count_overlaps(mysqli $mysqli, int $doctorId, int $roomId, int $patientId,
                        string $newStart, string $newEnd, ?int $excludeId = null): int {
    // We need conflicts where:
    //   - same doctor OR same room OR same patient
    //   - status != 'canceled'
    //   - NOT (existing_end <= new_start OR existing_start >= new_end)
    //
    // Appointments table must expose either date/from_time/to_time or computed start_dt/end_dt.
    // We'll compute on the fly using CONCAT(date, ' ', time).
    $sql = "
      SELECT COUNT(*) AS cnt
      FROM Appointments a
      WHERE a.status <> 'canceled'
        AND (
          a.doctorID = ? OR
          a.roomID   = ? OR
          a.patientID= ?
        )
        AND NOT (
          CONCAT(a.date, ' ', a.to_time)   <= ? OR
          CONCAT(a.date, ' ', a.from_time) >= ?
        )
    ";
    $types = "iiiss";
    $params = [$doctorId, $roomId, $patientId, $newStart, $newEnd];

    if ($excludeId !== null) {
        $sql .= " AND a.id <> ? ";
        $types .= "i";
        $params[] = $excludeId;
    }

    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (int)$res['cnt'];
}
