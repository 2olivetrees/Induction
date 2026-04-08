
from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("home/", views.home, name="home"),
    path("community/<int:community_id>/", views.community_detail, name="community_detail"),
    path("community/create/", views.create_community, name="create_community"),
    path("community/<int:community_id>/delete/", views.delete_community, name="delete_community"),
    path("community/<int:community_id>/leave/", views.leave_community, name="leave_community"),
    path("community/<int:community_id>/settings/", views.community_settings, name="community_settings"),
    path("community/<int:community_id>/events/", views.get_community_events, name="get_community_events"),
    path("community/<int:community_id>/events/create/", views.create_community_event, name="create_community_event"),   
    path("community/<int:community_id>/events/<int:event_id>/edit/", views.edit_community_event, name="edit_community_event"),
    path("community/<int:community_id>/events/<int:event_id>/delete/", views.delete_community_event, name="delete_community_event"),   
    path("community/<int:community_id>/invite/", views.invite_users, name="invite_users"),
    path("community/<int:community_id>/join/", views.accept_invitation, name="join_community"),
    path("community/<int:community_id>/decline/", views.decline_invite, name="decline_invite"),
    path("community/<int:community_id>/request/", views.request_to_join, name="request_to_join"),
    path("options/", views.options, name="options"),

    # Calendar endpoints
    path("events/", views.get_events, name="get_events"),
    path("events/create/", views.create_event, name="create_event"),
    path("events/<int:event_id>/edit/", views.edit_event, name="edit_event"),
    path("events/<int:event_id>/delete/", views.delete_event, name="delete_event"),
]