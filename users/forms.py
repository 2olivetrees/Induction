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


class CustomAuthenticationForm(AuthenticationForm):
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

class ProfileForm(forms.ModelForm):
    first_name = forms.CharField(max_length=30, required=False, label="First Name")
    last_name = forms.CharField(max_length=30, required=False, label="Last Name")
    username = forms.CharField(max_length=150, required=True, label="Username")
    email = forms.EmailField(required=True, label="Email")
    dob = forms.DateField(
        required=False,
        label="Date of Birth",
        input_formats=['%d/%m/%Y', '%Y-%m-%d'],
        widget=forms.TextInput(attrs={'placeholder': 'DD/MM/YYYY'})
    )
    class Meta:
        model = Profile
        fields = ['nickname', 'dob']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['username'].initial = self.instance.user.username
            self.fields['email'].initial = self.instance.user.email
            self.fields['first_name'].initial = self.instance.user.first_name
            self.fields['last_name'].initial = self.instance.user.last_name
        if self.instance.dob:
            self.fields['dob'].initial = self.instance.dob.strftime('%d/%m/%Y')
    def save(self, commit=True):
        profile = super().save(commit=False)
        user = profile.user
        user.first_name = self.cleaned_data.get('first_name', '')
        user.last_name = self.cleaned_data.get('last_name', '')
        user.username = self.cleaned_data.get('username', user.username)
        user.email = self.cleaned_data.get('email', user.email)
        profile.dob = self.cleaned_data.get('dob', profile.dob)  # save to profile not user
        if commit:
            user.save()
            profile.save()
        return profile