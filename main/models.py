from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
# Create your models here.

class Community(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    admin = models.ForeignKey(User, related_name='community_admin', on_delete=models.CASCADE)
    members = models.ManyToManyField(User, related_name='community_members', blank=True)
    invited_users = models.ManyToManyField(User, related_name='pending_invitations', blank=True)

    def __str__(self):
        return self.name


class CommunityJoinRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    group = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='join_requests')
    is_approved = models.BooleanField(default=False)
    votes = models.ManyToManyField(User, related_name='votes', blank=True)  # Tracks users who voted
    created_at = models.DateTimeField(auto_now_add=True)


class Event(models.Model):
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#7ebbf8")
    start = models.DateTimeField()
    end = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=True)

    owner = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='personal_events'
    )

    community = models.ForeignKey(
        Community,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='events'
    )

    is_community_event = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
    


    