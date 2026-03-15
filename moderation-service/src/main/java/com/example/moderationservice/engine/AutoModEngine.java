package com.example.moderationservice.engine;

import org.springframework.stereotype.Service;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Service
public class AutoModEngine {

    private static final Set<String> ACTION_KEYS = Set.of(
            "action", "action_reason", "set_flair", "overwrite_flair",
            "comment", "comment_stickied", "modmail", "modmail_subject",
            "message", "message_subject", "type", "priority", "moderators_exempt"
    );

    public AutoModResult evaluateRule(Map<String, Object> rule, AutoModContext context) {
        AutoModResult result = new AutoModResult();
        result.setTriggered(false);

        // Determine action
        Object actionObj = rule.get("action");
        if (actionObj != null) {
            String actionStr = actionObj.toString();
            if ("remove".equals(actionStr)) result.setAction("remove");
            else if ("approve".equals(actionStr)) result.setAction("approve");
            else if ("filter".equals(actionStr)) result.setAction("flag");
            else result.setAction(actionStr);
        } else if (rule.get("set_flair") != null) {
            result.setAction("set_flair");
        } else if (rule.get("modmail") != null || rule.get("modmail_subject") != null || rule.get("message") != null || rule.get("comment") != null) {
            result.setAction("send_modmail");
        }

        // Determine message
        if (rule.get("message") != null) {
            result.setMessage(rule.get("message").toString());
        } else if (rule.get("comment") != null) {
            result.setMessage(rule.get("comment").toString());
        } else if (rule.get("modmail") != null) {
            result.setMessage(rule.get("modmail").toString());
        }

        boolean triggered = evaluateConditions(rule, context);
        result.setTriggered(triggered);
        return result;
    }

    private boolean evaluateConditions(Map<String, Object> rule, AutoModContext context) {
        boolean hasCondition = false;

        for (Map.Entry<String, Object> entry : rule.entrySet()) {
            String rawKey = entry.getKey().toLowerCase(Locale.ROOT);
            if (isActionKey(rawKey)) continue;

            String fieldName = rawKey;
            String modifiers = "";
            boolean isNegation = false;

            if (fieldName.startsWith("~")) {
                isNegation = true;
                fieldName = fieldName.substring(1);
            }

            int parenIndex = fieldName.indexOf('(');
            if (parenIndex != -1) {
                int closeParenIndex = fieldName.indexOf(')', parenIndex + 1);
                if (closeParenIndex != -1) {
                    modifiers = fieldName.substring(parenIndex + 1, closeParenIndex).toLowerCase(Locale.ROOT);
                    fieldName = fieldName.substring(0, parenIndex).trim();
                }
            }

            boolean matched = false;
            boolean validCondition = false;

            if (fieldName.equals("title")) {
                matched = evaluateField(context.getTitle(), entry.getValue(), modifiers, "includes-word");
                validCondition = true;
            } else if (fieldName.equals("body")) {
                matched = evaluateField(context.getBody(), entry.getValue(), modifiers, "includes-word");
                validCondition = true;
            } else if (fieldName.equals("domain") || fieldName.equals("url")) {
                matched = evaluateField(context.getDomain(), entry.getValue(), modifiers, "includes");
                validCondition = true;
            } else if (fieldName.equals("flair_text")) {
                matched = evaluateField(context.getFlair(), entry.getValue(), modifiers, "full-exact");
                validCondition = true;
            } else if (fieldName.equals("author") && entry.getValue() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> authorBlock = (Map<String, Object>) entry.getValue();
                matched = evaluateAuthor(authorBlock, context);
                validCondition = true;
            }

            if (validCondition) {
                hasCondition = true;
                if (isNegation) matched = !matched;
                if (!matched) return false;
            }
        }
        return hasCondition || rule.containsKey("type");
    }

    private boolean isActionKey(String key) {
        return ACTION_KEYS.contains(key);
    }

    private boolean evaluateAuthor(Map<String, Object> authorBlock, AutoModContext context) {
        for (Map.Entry<String, Object> entry : authorBlock.entrySet()) {
            String key = entry.getKey().toLowerCase(Locale.ROOT);
            Object value = entry.getValue();

            boolean matched = false;
            if (key.equals("name")) {
                matched = evaluateField(context.getAuthor(), value, "full-exact", "full-exact");
            } else if (key.equals("account_age")) {
                matched = checkTimeThreshold(value, context.getAccountAge(), "days");
            } else if (key.equals("post_karma") || key.equals("comment_karma") || key.equals("combined_karma")) {
                matched = checkNumericThreshold(value, context.getKarma());
            } else {
                continue;
            }
            if (!matched) return false;
        }
        return true;
    }

    private boolean evaluateField(String text, Object patternsObj, String modifiersStr, String defaultModifier) {
        if (text == null) text = "";
        
        boolean caseSensitive = modifiersStr != null && modifiersStr.contains("case-sensitive");
        boolean isRegex = modifiersStr != null && modifiersStr.contains("regex");
        boolean exact = modifiersStr != null && modifiersStr.contains("full-exact");
        boolean startsWith = modifiersStr != null && modifiersStr.contains("starts-with");
        boolean endsWith = modifiersStr != null && modifiersStr.contains("ends-with");
        boolean fullText = modifiersStr != null && modifiersStr.contains("full-text");
        boolean includes = modifiersStr != null && modifiersStr.contains("includes") && !modifiersStr.contains("includes-word");
        boolean includesWord = modifiersStr != null && modifiersStr.contains("includes-word");

        if (!exact && !startsWith && !endsWith && !fullText && !includes && !includesWord && !isRegex) {
            String def = defaultModifier != null ? defaultModifier : "includes-word";
            if (def.equals("full-exact")) exact = true;
            else if (def.contains("includes") && !def.equals("includes-word")) includes = true;
            else if (def.equals("includes-word")) includesWord = true;
        }

        List<?> patterns;
        if (patternsObj instanceof List) {
            patterns = (List<?>) patternsObj;
        } else if (patternsObj instanceof String) {
            patterns = List.of(patternsObj);
        } else {
            return false;
        }

        String haystack = caseSensitive ? text : text.toLowerCase();

        for (Object pObj : patterns) {
            if (!(pObj instanceof String)) continue;
            String pattern = (String) pObj;
            String searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

            if (isRegex) {
                int flags = caseSensitive ? 0 : Pattern.CASE_INSENSITIVE;
                try {
                    if (Pattern.compile(pattern, flags).matcher(text).find()) return true;
                } catch (PatternSyntaxException ignored) {}
                continue;
            }

            if (exact) {
                if (haystack.equals(searchPattern)) return true;
            } else if (fullText) {
                if (haystack.trim().equals(searchPattern.trim())) return true;
            } else if (startsWith) {
                if (haystack.startsWith(searchPattern)) return true;
            } else if (endsWith) {
                if (haystack.endsWith(searchPattern)) return true;
            } else if (includesWord) {
                String regex = "\\b" + Pattern.quote(searchPattern) + "\\b";
                int flags = caseSensitive ? 0 : Pattern.CASE_INSENSITIVE;
                try {
                    if (Pattern.compile(regex, flags).matcher(text).find()) return true;
                } catch (PatternSyntaxException ignored) {}
            } else if (includes) {
                if (haystack.contains(searchPattern)) return true;
            }
        }
        return false;
    }

    private boolean checkNumericThreshold(Object thresholdObj, Integer value) {
        if (thresholdObj == null || value == null) return false;
        String threshold = thresholdObj.toString().trim();
        try {
            if (threshold.startsWith("<=")) return value <= Integer.parseInt(threshold.substring(2).trim());
            if (threshold.startsWith(">=")) return value >= Integer.parseInt(threshold.substring(2).trim());
            if (threshold.startsWith("==")) return value == Integer.parseInt(threshold.substring(2).trim());
            if (threshold.startsWith("<")) return value < Integer.parseInt(threshold.substring(1).trim());
            if (threshold.startsWith(">")) return value > Integer.parseInt(threshold.substring(1).trim());
            return value.equals(Integer.parseInt(threshold));
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private boolean checkTimeThreshold(Object thresholdObj, Integer valueInDays, String defaultUnit) {
        if (thresholdObj == null || valueInDays == null) return false;
        String threshold = thresholdObj.toString().trim().toLowerCase(Locale.ROOT);
        String operator = "==";
        if (threshold.startsWith("<=") || threshold.startsWith(">=") || threshold.startsWith("==")) {
            operator = threshold.substring(0, 2);
            threshold = threshold.substring(2).trim();
        } else if (threshold.startsWith("<") || threshold.startsWith(">")) {
            operator = threshold.substring(0, 1);
            threshold = threshold.substring(1).trim();
        }
        String[] parts = threshold.split(" ");
        if (parts.length == 0) return false;
        try {
            int amount = Integer.parseInt(parts[0]);
            String unit = parts.length > 1 ? parts[1] : defaultUnit;
            int thresholdDays = amount;
            if (unit.startsWith("month")) thresholdDays = amount * 30;
            else if (unit.startsWith("year")) thresholdDays = amount * 365;
            else if (unit.startsWith("week")) thresholdDays = amount * 7;
            else if (unit.startsWith("hour")) thresholdDays = Math.max(1, amount / 24);

            if (operator.equals("<=")) return valueInDays <= thresholdDays;
            if (operator.equals(">=")) return valueInDays >= thresholdDays;
            if (operator.equals("<")) return valueInDays < thresholdDays;
            if (operator.equals(">")) return valueInDays > thresholdDays;
            if (operator.equals("==")) return valueInDays == thresholdDays;
        } catch (NumberFormatException e) {
            return false;
        }
        return false;
    }
}
