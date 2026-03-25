package com.example.modmailservice.dto;

public class CreateApplicationRequest {
  private String subreddit;

  public String getSubreddit() {
    return subreddit;
  }

  public void setSubreddit(String subreddit) {
    this.subreddit = subreddit;
  }
}
