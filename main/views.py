import json
from django.contrib import messages
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST, require_http_methods
from requests import request
from .models import Event, Community
from django.http import HttpResponse 
from django.shortcuts import get_object_or_404, redirect, render
from .forms import CommunityCreationForm

@login_required(login_url='users:login')
def home(request):
    user_communities = Community.objects.filter(members=request.user)
    return render(request, "main/home.html", {'communities': user_communities})


@login_required(login_url='users:login')
def options(request):
    return render(request, "main/options.html")
@login_required

def create_community(request):
    if request.method == 'POST':
        form = CommunityCreationForm(request.POST, user=request.user)
        if form.is_valid():
            community = form.save()
            messages.success(request, f'Community "{community.name}" created successfully!')
            return redirect('main:community_detail', community_id=community.id)
    else:
        form = CommunityCreationForm(user=request.user)
    return render(request, 'main/create_community.html', {'form': form})

def community_detail(request, community_id):
    community = Community.objects.filter(id=community_id).first()
    if not community:
        return redirect('main:home')
    return render(request, 'main/community_detail.html', {'community': community})

def community_settings(request, community_id):
    community = Community.objects.filter(id=community_id).first()
    if not community:
        return redirect('main:home')
    return render(request, 'main/community_settings.html', {'community': community})

@login_required
def get_events(request):
    # Get personal events
    personal = Event.objects.filter(owner=request.user, is_community_event=False)

    # Get community events for all communities the user is in
    user_communities = Community.objects.filter(members=request.user)
    community_events = Event.objects.filter(community__in=user_communities, is_community_event=True)

    events = []

    for e in personal:
        events.append({
            'id': e.id,
            'title': e.title,
            'notes': e.notes,
            'date': str(e.date),
            'is_community_event': False,
        })

    for e in community_events:
        events.append({
            'id': e.id,
            'title': e.title,
            'notes': e.notes,
            'date': str(e.date),
            'is_community_event': True,
            'community_name': e.community.name,
            'community_id': e.community.id,
        })

    return JsonResponse({'events': events})


@login_required
@require_POST
def create_event(request):
    data = json.loads(request.body)
    title = data.get('title', '').strip()
    if not title:
        return JsonResponse({'error': 'Title required'}, status=400)

    community_id = data.get('community_id')

    if community_id:
        community = Community.objects.filter(id=community_id, members=request.user).first()
        if not community:
            return JsonResponse({'error': 'Community not found'}, status=404)
        event = Event.objects.create(
            title=title,
            notes=data.get('notes', ''),
            date=data.get('date'),
            community=community,
            is_community_event=True,
        )
    else:
        event = Event.objects.create(
            title=title,
            notes=data.get('notes', ''),
            date=data.get('date'),
            owner=request.user,
            is_community_event=False,
        )

    return JsonResponse({'id': event.id, 'title': event.title})


@login_required
def delete_community(request, community_id):
    community = get_object_or_404(Community, id=community_id)
    if request.user == community.admin:
        community.delete()
        messages.success(request, f'Community "{community.name}" has been deleted.')
    else:
        messages.error(request, "You do not have permission to delete this community.")
    return redirect('main:home')

@login_required
def leave_community(request, community_id):
    community = get_object_or_404(Community, id=community_id)

    if request.user not in community.members.all():
        messages.error(request, "You’re not a member of this community.")
        return redirect("main:community_detail", community_id=community.id)

    if request.user == community.admin:
        messages.error(request, "Admins can’t leave their own community. Transfer admin or delete the community.")
        return redirect("main:community_detail", community_id=community.id)

    community.members.remove(request.user)
    for event in community.events.all():
        event.check_status()
        event.save()
    messages.success(request, f'You left "{community.name}".')
    return redirect("main:home")


@login_required
@require_http_methods(["POST"])
def edit_event(request, event_id):
    data = json.loads(request.body)
    event = Event.objects.filter(id=event_id).first()

    if not event:
        return JsonResponse({'error': 'Event not found'}, status=404)

    # Only owner can edit personal events, any community member can edit community events
    if event.is_community_event:
        if not Community.objects.filter(id=event.community.id, members=request.user).exists():
            return JsonResponse({'error': 'Unauthorised'}, status=403)
    else:
        if event.owner != request.user:
            return JsonResponse({'error': 'Unauthorised'}, status=403)

    event.title = data.get('title', event.title).strip()
    event.notes = data.get('notes', event.notes)
    event.save()

    return JsonResponse({'success': True})


@login_required
@require_http_methods(["POST"])
def delete_event(request, event_id):
    event = Event.objects.filter(id=event_id).first()

    if not event:
        return JsonResponse({'error': 'Event not found'}, status=404)

    if event.is_community_event:
        if not Community.objects.filter(id=event.community.id, members=request.user).exists():
            return JsonResponse({'error': 'Unauthorised'}, status=403)
    else:
        if event.owner != request.user:
            return JsonResponse({'error': 'Unauthorised'}, status=403)

    event.delete()
    return JsonResponse({'success': True})

@login_required
def get_community_events(request, community_id):
    community = Community.objects.filter(id=community_id, members=request.user).first()
    if not community:
        return JsonResponse({'error': 'Not found'}, status=404)
    
    events = Event.objects.filter(community=community, is_community_event=True)
    return JsonResponse({'events': [{
        'id': e.id,
        'title': e.title,
        'notes': e.notes,
        'date': str(e.date),
        'is_community_event': True,
        'community_name': community.name,
        'community_id': community.id,
    } for e in events]})


@login_required
@require_POST
def create_community_event(request, community_id):
    community = Community.objects.filter(id=community_id, members=request.user).first()
    if not community:
        return JsonResponse({'error': 'Not found'}, status=404)
    
    data = json.loads(request.body)
    title = data.get('title', '').strip()
    if not title:
        return JsonResponse({'error': 'Title required'}, status=400)
    
    event = Event.objects.create(
        title=title,
        notes=data.get('notes', ''),
        date=data.get('date'),
        community=community,
        is_community_event=True,
    )
    return JsonResponse({'id': event.id, 'title': event.title})