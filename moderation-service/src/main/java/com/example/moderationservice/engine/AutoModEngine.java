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
            "message", "message_subject", "type", "priority", "moderators_exempt",
            "set_locked", "set_sticky", "set_nsfw", "set_contest_mode", "set_suggested_sort"
    );

    public AutoModResult evaluateRule(Map<String, Object> rule, AutoModContext context) {
        AutoModResult result = new AutoModResult();
        result.setTriggered(false);

        boolean isModExempt = true; 
        if (rule.containsKey("moderators_exempt")) {
            Object val = rule.get("moderators_exempt");
            if (val instanceof Boolean) {
                isModExempt = (Boolean) val;
            } else if (val instanceof String) {
                isModExempt = Boolean.parseBoolean((String) val);
            }
        }

        if (isModExempt && Boolean.TRUE.equals(context.getIsModerator())) {
            // Auto-approve or bypass rules if moderator is exempt and user is a mod
            return result;
        }

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
        } else if (rule.get("set_locked") != null) {
            result.setAction("lock");
        } else if (rule.get("set_sticky") != null) {
            result.setAction("sticky");
        } else if (rule.get("set_nsfw") != null) {
            result.setAction("nsfw");
        } else if (rule.get("set_contest_mode") != null) {
            result.setAction("contest_mode");
        } else if (rule.get("set_suggested_sort") != null) {
            result.setAction("suggested_sort");
        }

        // Determine message
        String msgTemplate = null;
        if (rule.get("message") != null) {
            msgTemplate = rule.get("message").toString();
        } else if (rule.get("comment") != null) {
            msgTemplate = rule.get("comment").toString();
        } else if (rule.get("modmail") != null) {
            msgTemplate = rule.get("modmail").toString();
        }

        boolean triggered = evaluateConditions(rule, context);
        if (triggered && msgTemplate != null) {
            result.setMessage(replacePlaceholders(msgTemplate, context));
        }
        result.setTriggered(triggered);
        return result;
    }

    private String replacePlaceholders(String template, AutoModContext context) {
        if (template == null) return null;
        String res = template;
        if (context.getAuthor() != null) res = res.replace("{{author}}", context.getAuthor());
        if (context.getTitle() != null) res = res.replace("{{title}}", context.getTitle());
        if (context.getBody() != null) res = res.replace("{{body}}", context.getBody());
        if (context.getDomain() != null) res = res.replace("{{domain}}", context.getDomain());
        if (context.getUrl() != null) res = res.replace("{{url}}", context.getUrl());
        if (context.getType() != null) res = res.replace("{{kind}}", context.getType());
        if (context.getId() != null) res = res.replace("{{id}}", context.getId());
        if (context.getFlair() != null) res = res.replace("{{flair_text}}", context.getFlair());
        if (context.getFlairCssClass() != null) res = res.replace("{{flair_css_class}}", context.getFlairCssClass());
        if (context.getSubreddit() != null) res = res.replace("{{subreddit}}", context.getSubreddit());
        if (context.getPermalink() != null) res = res.replace("{{permalink}}", context.getPermalink());
        return res;
    }

    private boolean matchesTypeCondition(String ruleType, AutoModContext context) {
        if (ruleType == null) return true;

        String normalizedRuleType = ruleType.toLowerCase(Locale.ROOT).trim();
        if (normalizedRuleType.isEmpty() || "any".equals(normalizedRuleType)) {
            return true;
        }

        String contextType = context.getType() == null ? "" : context.getType().toLowerCase(Locale.ROOT).trim();
        boolean isComment = contextType.contains("comment");
        boolean isSubmission = contextType.contains("submission") || contextType.contains("link") || contextType.contains("self") || contextType.contains("text");
        boolean hasUrl = context.getUrl() != null && !context.getUrl().isBlank();

        if (normalizedRuleType.equals("comment")) {
            return isComment;
        }
        if (normalizedRuleType.equals("submission")) {
            return isSubmission;
        }
        if (normalizedRuleType.equals("link submission")) {
            return isSubmission && hasUrl;
        }
        if (normalizedRuleType.equals("text submission")) {
            return isSubmission && !hasUrl;
        }

        if (normalizedRuleType.contains("comment")) {
            return isComment;
        }
        if (normalizedRuleType.contains("submission")) {
            return isSubmission;
        }

        return normalizedRuleType.equals(contextType);
    }

    private boolean evaluateConditions(Map<String, Object> rule, AutoModContext context) {
        boolean hasCondition = false;
        
        if (rule.containsKey("type")) {
            String ruleType = rule.get("type").toString();
            if (!matchesTypeCondition(ruleType, context)) {
                return false;
            }
        }

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
            } else if (fieldName.equals("domain")) {
                matched = evaluateField(context.getDomain(), entry.getValue(), modifiers, "includes");
                validCondition = true;
            } else if (fieldName.equals("url")) {
                matched = evaluateField(context.getUrl() != null ? context.getUrl() : context.getDomain(), entry.getValue(), modifiers, "includes");
                validCondition = true;
            } else if (fieldName.equals("id")) {
                matched = evaluateField(context.getId(), entry.getValue(), modifiers, "full-exact");
                validCondition = true;
            } else if (fieldName.equals("flair_text")) {
                matched = evaluateField(context.getFlair(), entry.getValue(), modifiers, "full-exact");
                validCondition = true;
            } else if (fieldName.equals("flair_css_class")) {
                matched = evaluateField(context.getFlairCssClass(), entry.getValue(), modifiers, "full-exact");
                validCondition = true;
            } else if (fieldName.equals("author") && entry.getValue() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> authorBlock = (Map<String, Object>) entry.getValue();
                matched = evaluateAuthor(authorBlock, context);
                validCondition = true;
            } else if (fieldName.equals("body_longer_than")) {
                matched = evaluateLength(context.getBody(), entry.getValue(), true);
                validCondition = true;
            } else if (fieldName.equals("body_shorter_than")) {
                matched = evaluateLength(context.getBody(), entry.getValue(), false);
                validCondition = true;
            } else if (fieldName.equals("reports")) {
                matched = checkNumericThreshold(entry.getValue(), context.getReports() != null ? context.getReports() : 0);
                validCondition = true;
            } else if (fieldName.equals("is_edited")) {
                matched = evaluateBoolean(context.getIsEdited(), entry.getValue());
                validCondition = true;
            } else if (fieldName.equals("is_top_level")) {
                matched = evaluateBoolean(context.getIsTopLevel(), entry.getValue());
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
        boolean satisfyAnyThreshold = false;
        Object satisfyAnyValue = authorBlock.get("satisfy_any_threshold");
        if (satisfyAnyValue instanceof Boolean) {
            satisfyAnyThreshold = (Boolean) satisfyAnyValue;
        } else if (satisfyAnyValue instanceof String) {
            satisfyAnyThreshold = Boolean.parseBoolean((String) satisfyAnyValue);
        }

        boolean hasThreshold = false;
        boolean anyThresholdMatched = false;

        for (Map.Entry<String, Object> entry : authorBlock.entrySet()) {
            String rawKey = entry.getKey().toLowerCase(Locale.ROOT).trim();
            Object value = entry.getValue();

            if (rawKey.equals("satisfy_any_threshold")) {
                continue;
            }

            String key = rawKey;
            String modifiers = "";
            int parenIndex = key.indexOf('(');
            if (parenIndex != -1) {
                int closeParenIndex = key.indexOf(')', parenIndex + 1);
                if (closeParenIndex != -1) {
                    modifiers = key.substring(parenIndex + 1, closeParenIndex).toLowerCase(Locale.ROOT);
                    key = key.substring(0, parenIndex).trim();
                }
            }

            boolean matched = false;
            boolean isThresholdCondition = false;
            if (key.equals("name")) {
                matched = evaluateField(context.getAuthor(), value, "full-exact", "full-exact");
            } else if (key.equals("is_moderator")) {
                matched = evaluateBoolean(context.getIsModerator(), value);
            } else if (key.equals("account_age")) {
                matched = checkTimeThreshold(value, context.getAccountAge(), "days");
                isThresholdCondition = true;
            } else if (key.equals("post_karma")) {
                matched = checkNumericThreshold(value, context.getPostKarma() != null ? context.getPostKarma() : context.getKarma());
                isThresholdCondition = true;
            } else if (key.equals("comment_karma")) {
                matched = checkNumericThreshold(value, context.getCommentKarma() != null ? context.getCommentKarma() : context.getKarma());
                isThresholdCondition = true;
            } else if (key.equals("combined_karma")) {
                Integer combinedKarma = context.getKarma();
                if (combinedKarma == null && context.getPostKarma() != null && context.getCommentKarma() != null) {
                    combinedKarma = context.getPostKarma() + context.getCommentKarma();
                }
                matched = checkNumericThreshold(value, combinedKarma);
                isThresholdCondition = true;
            } else if (key.equals("flair_text")) {
                matched = evaluateField(context.getFlair(), value, modifiers, "full-exact");
            } else if (key.equals("flair_css_class")) {
                matched = evaluateField(context.getFlairCssClass(), value, modifiers, "full-exact");
            } else {
                continue;
            }

            if (isThresholdCondition) {
                hasThreshold = true;
                if (matched) {
                    anyThresholdMatched = true;
                } else if (!satisfyAnyThreshold) {
                    return false;
                }
            } else if (!matched) {
                return false;
            }
        }

        if (satisfyAnyThreshold && hasThreshold && !anyThresholdMatched) {
            return false;
        }

        return true;
    }
    
    private boolean evaluateLength(String text, Object expected, boolean isLonger) {
        if (text == null) text = "";
        try {
            int length = Integer.parseInt(expected.toString());
            return isLonger ? text.length() > length : text.length() < length;
        } catch (NumberFormatException e) {
            return false;
        }
    }
    
    private boolean evaluateBoolean(Boolean value, Object expected) {
        boolean boolVal = Boolean.TRUE.equals(value);
        if (expected instanceof Boolean) {
            return boolVal == (Boolean) expected;
        } else if (expected instanceof String) {
            return boolVal == Boolean.parseBoolean((String) expected);
        }
        return false;
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
