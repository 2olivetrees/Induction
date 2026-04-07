from django import forms
from .models import Community

class CommunityCreationForm(forms.ModelForm):
    class Meta:
        model = Community
        fields = ['name']

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

    def save(self, commit=True):
        community = super().save(commit=False)
        community.admin = self.user
        if commit:
            community.save()
            community.members.add(self.user)
        return community