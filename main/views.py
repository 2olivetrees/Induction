import json
from datetime import datetime, timedelta
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
            'start': e.start.isoformat(),
            'end': e.end.isoformat() if e.end else None,
            'notes': e.notes,
            'all_day': e.all_day,
            'is_community_event': False,
})
        

    for e in community_events:
        events.append({
            'id': e.id,
            'title': e.title,
            'start': e.start.isoformat(),
            'end': e.end.isoformat() if e.end else None,
            'notes': e.notes,
            'all_day': e.all_day,
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

    # Parse the start date/time string to datetime
    date_str = data.get('start') or data.get('date')
    if not date_str:
        return JsonResponse({'error': 'Date required'}, status=400)
    
    try:
        start_datetime = datetime.fromisoformat(date_str)
    except ValueError:
        return JsonResponse({'error': 'Invalid date format'}, status=400)

    community_id = data.get('community_id')
    all_day = data.get('all_day', False)
    end_str = data.get('end')
    end_datetime = None

    if end_str:
        try:
            end_datetime = datetime.fromisoformat(end_str)
        except ValueError:
            return JsonResponse({'error': 'Invalid end date format'}, status=400)

    if community_id:
        community = Community.objects.filter(id=community_id, members=request.user).first()
        if not community:
            return JsonResponse({'error': 'Community not found'}, status=404)
        event = Event.objects.create(
            title=title,
            notes=data.get('notes', ''),
            start=start_datetime,
            end=end_datetime,
            all_day=all_day,
            owner=request.user,
            community=community,
            is_community_event=True,
        )
    else:
        event = Event.objects.create(
            title=title,
            notes=data.get('notes', ''),
            start=start_datetime,
            end=end_datetime,
            all_day=all_day,
            owner=request.user,
            is_community_event=False,
        )

    return JsonResponse({'id': event.id, 'title': event.title})


@login_required
@require_POST
def edit_event(request, event_id):
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    
    # Check permissions
    if event.owner != request.user and not (event.is_community_event and event.community.members.filter(id=request.user.id).exists()):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    data = json.loads(request.body)
    title = data.get('title', '').strip()
    if not title:
        return JsonResponse({'error': 'Title required'}, status=400)
    
    notes = data.get('notes', '')
    all_day = data.get('all_day', event.all_day)
    
    if 'start' in data and data['start']:
        try:
            event.start = datetime.fromisoformat(data['start'])
        except ValueError:
            return JsonResponse({'error': 'Invalid start date format'}, status=400)

    if 'end' in data:
        try:
            event.end = datetime.fromisoformat(data['end']) if data['end'] else None
        except ValueError:
            return JsonResponse({'error': 'Invalid end date format'}, status=400)
    
    event.title = title
    event.notes = notes
    event.all_day = all_day
    event.save()
    
    return JsonResponse({'id': event.id, 'title': event.title})


@login_required
@require_POST
def delete_event(request, event_id):
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    
    # Check permissions
    if event.owner != request.user and not (event.is_community_event and event.community.members.filter(id=request.user.id).exists()):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    event.delete()
    return JsonResponse({'success': True})


@login_required
def get_community_events(request, community_id):
    community = Community.objects.filter(id=community_id, members=request.user).first()
    if not community:
        return JsonResponse({'error': 'Community not found'}, status=404)
    
    events = Event.objects.filter(community=community, is_community_event=True)
    
    event_list = []
    for e in events:
        event_list.append({
            'id': e.id,
            'title': e.title,
            'start': e.start.isoformat(),
            'end': e.end.isoformat() if e.end else None,
            'notes': e.notes,
            'all_day': e.all_day,
            'is_community_event': True,
            'community_name': community.name,
            'community_id': community.id,
        })
    
    return JsonResponse({'events': event_list})


@login_required
@require_POST
def create_community_event(request, community_id):

    community = Community.objects.filter(
        id=community_id,
        members=request.user
    ).first()

    if not community:
        return JsonResponse({'error': 'Community not found'}, status=404)

    data = json.loads(request.body)

    title = data.get('title', '').strip()
    if not title:
        return JsonResponse({'error': 'Title required'}, status=400)

    start_str = data.get('start')
    end_str = data.get('end')
    all_day = data.get("all_day", False)
    if not start_str:
        return JsonResponse({'error': 'Start time required'}, status=400)

    try:
        start = datetime.fromisoformat(start_str)
        end = datetime.fromisoformat(end_str) if end_str else None
    except ValueError:
        return JsonResponse({'error': 'Invalid datetime format'}, status=400)

    event = Event.objects.create(
        title=title,
        notes=data.get('notes', ''),
        start=start,
        end=end,
        all_day=all_day,
        owner=request.user,
        community=community,
        is_community_event=True
    )

    return JsonResponse({
        'id': event.id,
        'title': event.title,
        'start': event.start,
        'end': event.end
    })


@login_required
@require_POST
def edit_community_event(request, community_id, event_id):
    
    community = Community.objects.filter(id=community_id, members=request.user).first()
    if not community:
        return JsonResponse({'error': 'Community not found'}, status=404)
    
    try:
        event = Event.objects.get(id=event_id, community=community, is_community_event=True)
    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    
    data = json.loads(request.body)
    title = data.get('title', '').strip()
    if not title:
        return JsonResponse({'error': 'Title required'}, status=400)
    
    notes = data.get('notes', '')
    all_day = data.get('all_day', event.all_day)
    
    # Update start and end times if provided
    if data.get('start'):
        try:
            event.start = datetime.fromisoformat(data['start'])
        except ValueError:
            return JsonResponse({'error': 'Invalid start date format'}, status=400)
    
    if data.get('end'):
        try:
            event.end = datetime.fromisoformat(data['end']) if data['end'] else None
        except ValueError:
            return JsonResponse({'error': 'Invalid end date format'}, status=400)
    
    event.title = title
    event.notes = notes
    event.all_day = all_day
    event.save()
    
    return JsonResponse({'id': event.id, 'title': event.title})

    event.save()
        
    return JsonResponse({'id': event.id, 'title': event.title})


@login_required
@require_POST
def delete_community_event(request, community_id, event_id):
    community = Community.objects.filter(id=community_id, members=request.user).first()
    if not community:
        return JsonResponse({'error': 'Community not found'}, status=404)
    
    try:
        event = Event.objects.get(id=event_id, community=community, is_community_event=True)
    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    
    event.delete()
    return JsonResponse({'success': True})


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
        event.save()
    messages.success(request, f'You left "{community.name}".')
    return redirect("main:home")


@login_required
@require_http_methods(["POST"])
def edit_event(request, event_id):
    data = json.loads(request.body)
    event = get_object_or_404(Event, id=event_id)
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
    event = get_object_or_404(Event, id=event_id)
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
    'start': e.start.isoformat(),
    'end': e.end.isoformat() if e.end else None,
    'allDay': e.all_day,
    'is_community_event': True,
    'community_name': community.name,
    'community_id': community.id,
        } for e in events]})


@login_required
@require_POST
def create_community_event(request, community_id):

    community = Community.objects.filter(
        id=community_id,
        members=request.user
    ).first()

    if not community:
        return JsonResponse({'error': 'Not found'}, status=404)

    data = json.loads(request.body)

    title = data.get('title','').strip()
    if not title:
        return JsonResponse({'error':'Title required'}, status=400)

    notes = data.get('notes','')

    start_str = data.get('start')
    end_str = data.get('end')
    all_day = data.get('all_day', False)

    start = datetime.fromisoformat(start_str) if start_str else None
    end = datetime.fromisoformat(end_str) if end_str else None

    # default 1 hour if no end
    if start and not end and not all_day:
        end = start + timedelta(hours=1)

    event = Event.objects.create(
        title=title,
        notes=notes,
        start=start,
        end=end,
        all_day=all_day,
        community=community,
        owner=request.user,
        is_community_event=True
    )

    return JsonResponse({
        'id': event.id,
        'title': event.title
    })