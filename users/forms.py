from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User
from .models import Profile

class UserRegistrationForm(UserCreationForm):
    username = forms.CharField(max_length=150, required=True, label="Username")
    email = forms.EmailField(required=True, label="Email")

    class Meta:

        model = User
        # include username so a separate username field appears in the form
        fields = ['username', 'email', 'password1', 'password2']

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        # ensure email is unique (username is now separate)
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        username = self.cleaned_data['username'].strip()
        email = self.cleaned_data['email'].strip().lower()
        user.username = username           # use the provided username for login
        user.email = email


        if commit:
            user.save()
            # ensure profile & nickname
            profile, _ = Profile.objects.get_or_create(user=user)
        return user


class AuthenticationForm(AuthenticationForm):
    username = forms.CharField(
        label="Email or Username",
        widget=forms.TextInput(attrs={"autofocus": True})
    )
    
    def clean_username(self):
        username = self.cleaned_data.get('username', '').strip().lower()
        return username
    
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        # Additional checks can be added here if needed
