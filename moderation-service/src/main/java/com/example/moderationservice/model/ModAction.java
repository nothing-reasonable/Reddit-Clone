package com.example.moderationservice.model;

public enum ModAction {
    REMOVE_POST,
    REMOVE_COMMENT,
    APPROVE_POST,
    APPROVE_COMMENT,
    BAN_USER,
    UNBAN_USER,
    WARN_USER,
    MUTE_USER,
    LOCK_POST,
    UNLOCK_POST,
    PIN_POST,
    UNPIN_POST,
    EDIT_FLAIR,
    UPDATE_RULES
}
