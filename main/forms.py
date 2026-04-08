from django import forms
from .models import Community

class CommunityCreationForm(forms.ModelForm):
    description = forms.CharField(widget=forms.Textarea(attrs={'rows': 4}), required=False, label="Description")
    class Meta:
        model = Community
        fields = ['name', 'description']

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