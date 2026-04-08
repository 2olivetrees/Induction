from django import forms
from .models import Community

class CommunityCreationForm(forms.ModelForm):
    description = forms.CharField(widget=forms.Textarea(attrs={'rows': 4}), required=False, label="Description")
    color = forms.CharField(
        widget=forms.TextInput(attrs={'type': 'color'}),
        required=False,
        label="Community Color",
        initial="#7ebbf8"
    )

    class Meta:
        model = Community
        fields = ['name', 'description', 'color']

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

    def save(self, commit=True):
        community = super().save(commit=False)
        is_new = community.pk is None
        if is_new:
            community.admin = self.user
        if commit:
            community.save()
            if is_new:
                community.members.add(self.user)
        return community