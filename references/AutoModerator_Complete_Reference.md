# AutoModerator Complete Reference Guide

> **Source**: This document is compiled from Reddit's archived AutoModerator source code and community examples. It serves as a comprehensive reference for understanding and writing AutoModerator rules.

## Table of Contents

1. [Introduction](#introduction)
2. [Rule Structure](#rule-structure)
3. [Checks (Conditions)](#checks-conditions)
4. [Actions](#actions)
5. [Match Modifiers](#match-modifiers)
6. [Placeholders](#placeholders)
7. [Complete Examples](#complete-examples)
8. [Common Patterns](#common-patterns)

---

## Introduction

AutoModerator is a system built into Reddit that allows moderators to define rules (consisting of checks and actions) to be automatically applied to posts in their subreddit. The rules are defined using YAML syntax and stored on a special wiki page in each subreddit.

### How It Works

- AutoModerator checks submissions and comments against defined rules
- Each rule consists of conditions (checks) and actions
- If all conditions are satisfied, the actions are performed
- Rules are processed in priority order (higher priority first)
- Removal rules stop processing once one triggers

---

## Rule Structure

### Basic Format

Each rule is a YAML document separated by `---` (three hyphens). A rule consists of:

```yaml
# Optional: Rule priority (higher = processed first)
priority: 500

# Type of content to check
type: comment  # or: submission, any, link submission, text submission

# Checks (conditions) - all must be satisfied
title: [keyword1, keyword2]
author:
    account_age: "< 7 days"

# Actions - performed when checks pass
action: remove
comment: "Your post was removed because..."
```

### Rule Separation

```yaml
# First rule
title: [cats]
action: remove

---

# Second rule (separated by three hyphens)
title: [dogs]
action: approve
```

---

## Checks (Conditions)

### Content-Type Checks

| Check | Values | Description |
|-------|--------|-------------|
| `type` | `comment`, `submission`, `any`, `link submission`, `text submission` | Type of content the rule applies to |

### Text Matching Checks

These checks match against text fields and support modifiers.

#### Available Fields

| Field | Applies To | Description |
|-------|------------|-------------|
| `title` | Submissions | Post title |
| `body` | Comments, Text Posts | Content body |
| `domain` | Link Submissions | Domain of linked URL |
| `url` | Link Submissions | Full URL |
| `id` | All | Reddit item ID |
| `flair_text` | Submissions | Flair text |
| `flair_css_class` | Submissions | Flair CSS class |
| `media_author` | Media Links | Author from embed |
| `media_author_url` | Media Links | Author URL from embed |
| `media_title` | Media Links | Title from embed |
| `media_description` | Media Links | Description from embed |

#### Text Check Examples

```yaml
# Simple text match (case-insensitive by default)
title: [cats, dogs]
action: remove

# Multiple values (any match triggers)
title: [keyword1, keyword2, keyword3]

# Negation (match if NOT found)
~title: [allowed_word]
action: remove
```

### Author Checks

Defined under the `author:` key:

```yaml
author:
    # Account name matching
    name: [username1, username2]
    
    # Account age (supports <, >, == operators)
    account_age: "< 7 days"
    account_age: "> 30 days"
    
    # Karma thresholds
    comment_karma: "< 10"
    post_karma: "< 100"
    combined_karma: "< 50"
    
    # User status checks
    is_moderator: true
    is_contributor: true
    is_submitter: true
    is_gold: true
    
    # Flair checks
    flair_text: [flair1, flair2]
    flair_css_class: [class1, class2]
```

#### Karma and Age Operators

```yaml
# Less than
comment_karma: "< 100"

# Greater than
comment_karma: "> 100"

# Equal to
comment_karma: "== 100"

# Time periods
account_age: "< 7 days"
account_age: "< 1 month"
account_age: "> 1 year"
```

### Report Checks

```yaml
# Trigger when item has X or more reports
reports: 3
action: remove
modmail: "Item removed due to 3+ reports"
```

### Body Length Checks

```yaml
# Body must be longer than X characters
body_longer_than: 100

# Body must be shorter than X characters
body_shorter_than: 500

# Ignore blockquotes in length check
ignore_blockquotes: true
```

### Comment Position Checks

```yaml
# Only top-level comments
is_top_level: true

# Only replies (not top-level)
is_top_level: false

# Check if edited
is_edited: true
```

### Parent Submission Checks

For comments, you can check the parent submission:

```yaml
type: comment
parent_submission:
    title: [keyword]
    domain: [example.com]
action: remove
```

---

## Actions

### Content Actions

| Action | Values | Description |
|--------|--------|-------------|
| `action` | `approve`, `remove`, `spam`, `filter`, `report` | Main moderation action |

```yaml
# Remove content
action: remove

# Mark as spam
action: spam

# Filter (keep in modqueue)
action: filter

# Approve content
action: approve

# Report to moderators
action: report
action_reason: "Inappropriate content detected"
```

### Flair Actions

```yaml
# Set post flair
set_flair: "Flair Text"

# Set flair with CSS class
set_flair: ["Flair Text", "css-class"]

# Overwrite existing flair
overwrite_flair: true
set_flair: ["New Flair", "new-class"]
```

### Comment Actions

```yaml
# Post a comment
comment: |
    Your post has been removed because...
    
    Please read the rules before posting.

# Make comment sticky (on submissions)
comment_stickied: true
```

### Message Actions

```yaml
# Send modmail
modmail: |
    A post by /u/{{author}} was removed.
    Title: {{title}}

# Custom modmail subject
modmail_subject: "AutoMod Alert: Rule Violation"

# Send PM to user
message: |
    Your submission was removed from /r/{{subreddit}}.
    
    Reason: Low karma account.

# Custom PM subject
message_subject: "Important: Post Removed"
```

### Post Settings Actions

```yaml
# Lock post
set_locked: true

# Sticky post (1 or 2 for slot number)
set_sticky: true
set_sticky: 1  # First sticky slot
set_sticky: 2  # Second sticky slot

# Mark as NSFW
set_nsfw: true

# Enable contest mode
set_contest_mode: true

# Set suggested sort
set_suggested_sort: "new"
set_suggested_sort: "best"
set_suggested_sort: "top"
set_suggested_sort: "controversial"
```

---

## Match Modifiers

Modifiers change how text matching works. They are specified in parentheses after the field name.

### Available Modifiers

| Modifier | Description |
|----------|-------------|
| `full-exact` | Must match entire text exactly |
| `full-text` | Match entire text (allows surrounding whitespace/punctuation) |
| `includes` | Text must contain the pattern (default for most fields) |
| `includes-word` | Match as complete word (default for title/body) |
| `starts-with` | Text must start with the pattern |
| `ends-with` | Text must end with the pattern |
| `case-sensitive` | Case-sensitive matching |
| `regex` | Treat value as regular expression |

### Modifier Examples

```yaml
# Exact match
title (full-exact): "Exact Title Here"

# Contains anywhere
body (includes): "keyword"

# Word boundary match
title (includes-word): "cat"  # Matches "cat" but not "category"

# Starts with
title (starts-with): "[Meta]"

# Ends with
url (ends-with): ".pdf"

# Case-sensitive
title (case-sensitive): "SPECIFIC TEXT"

# Regular expression
title (regex, includes): "(?i)(cat|dog)s?"

# Combined modifiers
body (regex, case-sensitive): "^[A-Z]+"  # Starts with uppercase
```

### Field-Specific Defaults

| Field | Default Modifier |
|-------|------------------|
| `id` | `full-exact` |
| `url` | `includes` |
| `media_author` | `full-exact` |
| `media_author_url` | `includes` |
| `flair_text` | `full-exact` |
| `flair_css_class` | `full-exact` |
| `domain` | `includes` (with subdomain handling) |
| Others | `includes-word` |

---

## Placeholders

Placeholders are replaced with actual values in comments, messages, and some other fields.

### Available Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{{author}}` | Author's username |
| `{{body}}` | Post/comment body |
| `{{subreddit}}` | Subreddit name |
| `{{title}}` | Post title |
| `{{domain}}` | Link domain |
| `{{url}}` | Link URL |
| `{{permalink}}` | Full permalink to item |
| `{{kind}}` | "submission" or "comment" |
| `{{author_flair_text}}` | Author's flair text |
| `{{author_flair_css_class}}` | Author's flair CSS class |
| `{{media_author}}` | Media embed author |
| `{{media_title}}` | Media embed title |
| `{{media_description}}` | Media embed description |
| `{{media_author_url}}` | Media embed author URL |

### Match Placeholders

When using regex matches, captured groups can be referenced:

```yaml
title (regex): "sell my ([a-z]+)"
comment: "Your post mentions selling {{match-1}}, which isn't allowed."
```

```yaml
# Multiple capture groups
title (regex): "\[([A-Z]+)\].*by\s+(.+)"
comment: "Tag: {{match-1}}, Author mentioned: {{match-2}}"
```

### Placeholder Examples

```yaml
# In comments
comment: |
    Hello /u/{{author}}!
    
    Your submission "{{title}}" has been removed.
    Please read the rules of /r/{{subreddit}}.

# In modmail
modmail: |
    User {{author}} posted:
    {{permalink}}
    
    Title: {{title}}

# In PMs
message: |
    Your comment in /r/{{subreddit}} was removed.
    
    {{permalink}}
```

---

## Complete Examples

### Example 1: Remove Low-Effort Posts

```yaml
# Remove posts with very short body
type: submission
body_shorter_than: 10
action: remove
comment: |
    Your post has been removed for being too short.
    Please add more content to your submission.
```

### Example 2: Account Age Requirement

```yaml
# Remove posts from new accounts
type: submission
author:
    account_age: "< 7 days"
action: remove
message: |
    Hello {{author}},
    
    Your submission to /r/{{subreddit}} was removed because your account is less than 7 days old.
    This is an anti-spam measure. Please try again later.
```

### Example 3: Karma Requirements

```yaml
# Require minimum karma
priority: 500
type: comment
author:
    comment_karma: "< 10"
    is_moderator: false
action: remove
comment: "Your account doesn't meet our minimum karma requirements."
```

### Example 4: Keyword Filtering with Flair

```yaml
# Filter posts about specific topics and set flair
type: submission
title: [cryptocurrency, bitcoin, crypto]
set_flair: ["Cryptocurrency", "crypto-flair"]
modmail: "Crypto post detected from {{author}}: {{title}}"
```

### Example 5: Domain-Based Actions

```yaml
# Handle specific domains
type: submission
domain: [youtube.com, youtu.be]
set_flair: ["Video", "video-flair"]

---

# Remove spam domains
type: submission
domain: [spamsite.com, sketchy.net]
action: spam
action_reason: "Known spam domain"
```

### Example 6: Report Handling

```yaml
# Alert on multiple reports
reports: 2
modmail: |
    The above item has received 2+ reports, please investigate.
    {{permalink}}

---

# Auto-remove on many reports
reports: 5
action: remove
modmail: |
    Item automatically removed due to 5+ reports.
    {{permalink}}
```

### Example 7: Auto-Approve Moderators

```yaml
# Re-approve moderator content if reported
author:
    is_moderator: true
reports: 1
action: approve
```

### Example 8: All Caps Filter

```yaml
# Filter all-caps titles
type: submission
title (case-sensitive, regex, full-text): "([A-Z0-9!,.]|\\W)+"
action: filter
action_reason: "All Caps Title"
comment: "Please don't use all caps in your title."
```

### Example 9: Mobile Link Warning

```yaml
# Warn about mobile links
type: submission
domain (starts-with): "mobile."
comment: |
    Your submission linked to the mobile version of a website.
    Please submit a non-mobile link instead.
```

### Example 10: Meta Post Alert

```yaml
# Alert mods about meta posts
type: submission
title: [this subreddit, meta, mods, moderators]
modmail: |
    A meta submission has been made by /u/{{author}}.
    
    **Title:** {{title}}
    {{permalink}}
```

### Example 11: Comprehensive Rule Set

```yaml
###### Reload AutoModerator after editing
# To reload: http://www.reddit.com/message/compose/?to=AutoModerator&subject=YOURSUBREDDIT&message=update

---
# Remove posts from accounts less than 24 hours old
type: submission
author:
    account_age: "< 1 day"
action: remove
comment: |
    Your submission has been automatically removed.
    Your account is less than 24 hours old.

---
# Require minimum comment karma for comments
type: comment
author:
    comment_karma: "< 5"
    satisfy_any_threshold: false
    is_moderator: false
action: remove
message: |
    Your comment was removed because your account doesn't meet our karma requirements.
    You need at least 5 comment karma to comment here.

---
# Auto-set flair based on title keywords
type: submission
title: [question, help, advice]
set_flair: ["Question", "question-flair"]

---
# Lock controversial posts
type: submission
reports: 10
set_locked: true
modmail: "Post locked due to 10+ reports: {{permalink}}"

---
# Sticky announcements
type: submission
title (starts-with): "[Announcement]"
set_sticky: 1
set_locked: true
set_suggested_sort: "new"
```

---

## Common Patterns

### Anti-Spam Patterns

```yaml
# New account filter
author:
    account_age: "< 3 days"
action: filter

---
# Low karma filter
author:
    combined_karma: "< 10"
action: filter

---
# Combined restrictions
author:
    account_age: "< 7 days"
    comment_karma: "< 50"
    satisfy_any_threshold: false  # All conditions must be met
action: remove
```

### Content Quality Patterns

```yaml
# Minimum effort
type: submission
body_longer_than: 100
action: remove
action_reason: "Low effort post"

---
# Title requirements
type: submission
title (regex, includes): "^\\[.*\\]"  # Require tag at start
~title (regex): "^\\[.*\\]"  # Match if NO tag
action: remove
comment: "Your post title must start with a tag like [Discussion] or [Help]"
```

### Moderation Helper Patterns

```yaml
# Auto-approve AutoModerator
author: [AutoModerator]
reports: 1
action: approve

---
# Modmail formatting
modmail_subject: "[AutoMod] {{kind}} by {{author}}"
modmail: |
    **Type:** {{kind}}
    **Author:** {{author}}
    **Title:** {{title}}
    **Link:** {{permalink}}
```

### Using Standards

AutoModerator supports standard rule templates:

```yaml
# Use a standard rule as base
standard: video hosting sites
set_flair: "Video"

---
# Override standard values
standard: facebook links
set_flair: "Facebook Post"
action: filter  # Override the default action
```

---

## Priority System

Rules are processed in order of priority (highest first). Default priority is 0.

```yaml
# High priority - processed first
priority: 1000
author:
    is_moderator: true
action: approve

---
# Normal priority
priority: 0
title: [banned word]
action: remove

---
# Low priority - processed last
priority: -100
body: ".*"
comment: "Generic comment"
```

### Priority Guidelines

- **Removal rules**: Should have appropriate priority
- Once a removal rule triggers, no more removal rules are checked
- Non-removal rules continue processing after any rule triggers

---

## Moderator Exemption

By default, moderators are exempt from removal and report rules:

```yaml
# This won't apply to moderators by default
action: remove

---
# Explicitly include moderators
moderators_exempt: false
action: remove

---
# Explicitly exempt moderators
moderators_exempt: true
action: remove
```

---

## Best Practices

1. **Organize rules logically** - Group similar rules together
2. **Use comments** - Add `# comments` to explain complex rules
3. **Test thoroughly** - Use a test subreddit or alt account
4. **Use priority wisely** - Higher priority for exceptions/overrides
5. **Be careful with regex** - Test regex patterns thoroughly
6. **Don't over-automate** - Some things need human judgment
7. **Keep rules DRY** - Use standards and common patterns
8. **Monitor modmail** - Set up alerts for important events
9. **Handle edge cases** - Consider all content types
10. **Document your rules** - Future mods will thank you

---

## Troubleshooting

### Common Issues

1. **Rule not triggering**: Check all conditions are met, verify type matches
2. **Unexpected matches**: Check case sensitivity and word boundaries
3. **Regex errors**: Escape special characters, test patterns separately
4. **Actions not working**: Verify permissions and field values
5. **Performance issues**: Simplify complex regex, reduce rule count

### Debugging Tips

1. Use `action: filter` instead of `action: remove` to test
2. Add `modmail` actions to see when rules trigger
3. Test with alt accounts for author conditions
4. Check the mod log for AutoModerator actions
5. Use `action_reason` to identify which rule triggered

---

## File Location

AutoModerator rules are stored in the subreddit wiki at:
- `https://www.reddit.com/r/YOURSUBREDDIT/wiki/automoderator` (Needs change according to rule addition)

After editing, reload the configuration by messaging AutoModerator:
- Subject: Your subreddit name
- Body: `update`

Or visit:
- `https://www.reddit.com/message/compose/?to=AutoModerator&subject=YOURSUBREDDIT&message=update`

---

*This reference guide was compiled from Reddit's open-source AutoModerator implementation and community resources.*
