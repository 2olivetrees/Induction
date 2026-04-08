from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0003_remove_event_date_event_all_day_event_color_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='community',
            name='color',
            field=models.CharField(default='#7ebbf8', max_length=7),
        ),
    ]
