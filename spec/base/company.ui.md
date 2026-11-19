# Form: Company

The form of `Company`, proposed by `pisa propose-specs` from the domain model. The Salt mockup below is
the layout `pisa generate` renders: reorder the lines, group them in boxes, side by side in one line,
or change the labels. Every field of the model must appear exactly once.

```plantuml
@startsalt
<style>
saltDiagram {
  BackgroundColor #F8F9FA
  FontName "Helvetica"
  FontSize 14
  FontColor #212529
}
</style>
{
  <back:#212529><color:#FFFFFF><size:16>  Home   </size></color><color:#ADB5BD>Persons</color><color:#ADB5BD>   </color><color:#FFFFFF><b>Companies</b></color><color:#ADB5BD>                                  </color><color:#FFFFFF>[ ☰ ]  </color></back>
  .
  <size:22><b>Companies</b></size>
  .
  {+
    <size:16><b>New Company</b></size>
    {^" "
      <b>Name</b> <color:#DC3545>*</color> | "name                    "
      Employees
      {#
        <back:#E9ECEF><b>First Name</b></back> | <back:#E9ECEF><b>Last Name</b></back> | <back:#E9ECEF><b>Email</b></back>
        employees.firstName | employees.lastName | employees.email
      }
    }
    { [<color:#FFFFFF><back:#0D6EFD>  Create  </back></color>] | [<color:#6C757D>  Save  </color>] | [<color:#6C757D>  Cancel  </color>] }
  }
  .
  {#
    <back:#E9ECEF><b>Id</b></back> | <back:#E9ECEF><b>Name</b></back> | <back:#E9ECEF>    </back>
    1 | Name 1 | <color:#0D6EFD>[Edit]</color> <color:#DC3545>[Delete]</color>
    2 | Name 2 | <color:#0D6EFD>[Edit]</color> <color:#DC3545>[Delete]</color>
  }
  <size:12><color:#6C757D>[Previous]  Page 1 of 1 (2 entries)  [Next]</color></size>
}
@endsalt
```
